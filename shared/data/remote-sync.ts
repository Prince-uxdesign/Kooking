import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import type { CookingHistoryEntry } from "@/shared/domain/cooking-history";
import { cookingHistoryEntrySchema } from "@/shared/domain/cooking-history";
import type { UserCookingPreferences } from "@/shared/domain/preferences";
import {
  DEFAULT_USER_PREFERENCES,
  userCookingPreferencesSchema,
} from "@/shared/domain/preferences";
import type { ShoppingList } from "@/shared/domain/shopping";
import {
  dbRowToShoppingItem,
  mergeShoppingLists,
  shoppingItemToDbRow,
} from "@/shared/domain/shopping-sync";

/**
 * Remote Synchronization Port (Phase 35).
 * Connects client UI to account-backed cloud storage (Supabase)
 * with robust offline and test fallbacks.
 */

export interface RemoteSyncPort {
  readonly isCloudBacked: boolean;
  syncShoppingList(
    userId: string,
    local: ShoppingList,
  ): Promise<{ list: ShoppingList; error?: string }>;
  fetchCookingHistory(userId: string): Promise<{ entries: CookingHistoryEntry[]; error?: string }>;
  recordCookingHistory(
    userId: string,
    entry: CookingHistoryEntry,
  ): Promise<{ success: boolean; error?: string }>;
  fetchUserPreferences(
    userId: string,
  ): Promise<{ preferences: UserCookingPreferences | null; error?: string }>;
  saveUserPreferences(
    userId: string,
    prefs: UserCookingPreferences,
  ): Promise<{ success: boolean; error?: string }>;
}

/**
 * Supabase implementation with Row Level Security.
 */
export class SupabaseSyncAdapter implements RemoteSyncPort {
  readonly isCloudBacked = true;

  async syncShoppingList(
    userId: string,
    local: ShoppingList,
  ): Promise<{ list: ShoppingList; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { list: local, error: "Cloud storage is not configured." };
    }

    try {
      // 1. Fetch remote items for this user
      const { data: rows, error: fetchErr } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("user_id", userId);

      if (fetchErr) {
        return { list: local, error: fetchErr.message };
      }

      // 2. Parse remote items
      const remoteItems = (rows || []).map(dbRowToShoppingItem);
      const remoteMaxTime = remoteItems.reduce(
        (max, i) => Math.max(max, i.updatedAt ?? i.createdAt),
        0,
      );
      const remoteList: ShoppingList = {
        id: `list_${userId}`,
        ownerId: userId,
        items: remoteItems,
        updatedAt: remoteMaxTime,
      };

      // 3. Resolve merge with Last-Write-Wins
      const { mergedList } = mergeShoppingLists(local, remoteList, {
        ownerId: userId,
      });

      // 4. Upsert merged items into Supabase
      if (mergedList.items.length > 0) {
        const rowsToUpsert = mergedList.items.map((i) => shoppingItemToDbRow(i, userId));
        const { error: upsertErr } = await supabase.from("shopping_items").upsert(rowsToUpsert, {
          onConflict: "user_id,id",
        });

        if (upsertErr) {
          return { list: mergedList, error: upsertErr.message };
        }
      }

      // 5. Clean up any remote items that were deleted in mergedList
      const mergedIds = new Set(mergedList.items.map((i) => i.id));
      const removedIds = remoteItems.filter((i) => !mergedIds.has(i.id)).map((i) => i.id);
      if (removedIds.length > 0) {
        await supabase.from("shopping_items").delete().eq("user_id", userId).in("id", removedIds);
      }

      return { list: mergedList };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      return { list: local, error: msg };
    }
  }

  async fetchCookingHistory(
    userId: string,
  ): Promise<{ entries: CookingHistoryEntry[]; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { entries: [], error: "Cloud storage is not configured." };
    }

    try {
      const { data, error } = await supabase
        .from("cooking_history")
        .select("*")
        .eq("user_id", userId)
        .order("started_at_ms", { ascending: false });

      if (error) {
        return { entries: [], error: error.message };
      }

      const entries: CookingHistoryEntry[] = (data || []).map((row) =>
        cookingHistoryEntrySchema.parse({
          id: String(row.id),
          sessionId: String(row.session_id),
          userId: String(row.user_id),
          recipeId: String(row.recipe_id),
          recipeTitle: String(row.recipe_title),
          recipeSlug: String(row.recipe_slug),
          contentVersion: Number(row.content_version),
          servings: Number(row.servings),
          status: row.status,
          startedAt: Number(row.started_at_ms),
          completedAt: row.completed_at_ms ? Number(row.completed_at_ms) : null,
          durationMinutes: row.duration_minutes !== null ? Number(row.duration_minutes) : null,
          completedStepsCount: Number(row.completed_steps_count || 0),
          totalStepsCount: Number(row.total_steps_count || 0),
          createdAt: new Date(row.created_at).getTime(),
        }),
      );

      return { entries };
    } catch (e) {
      return { entries: [], error: e instanceof Error ? e.message : "History load failed" };
    }
  }

  async recordCookingHistory(
    userId: string,
    entry: CookingHistoryEntry,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Cloud storage is not configured." };
    }

    try {
      const { error } = await supabase.from("cooking_history").upsert(
        {
          user_id: userId,
          session_id: entry.sessionId,
          recipe_id: entry.recipeId,
          recipe_title: entry.recipeTitle,
          recipe_slug: entry.recipeSlug,
          content_version: entry.contentVersion,
          servings: entry.servings,
          status: entry.status,
          started_at_ms: entry.startedAt,
          completed_at_ms: entry.completedAt,
          duration_minutes: entry.durationMinutes,
          completed_steps_count: entry.completedStepsCount,
          total_steps_count: entry.totalStepsCount,
        },
        { onConflict: "user_id,session_id" },
      );

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Failed to record history" };
    }
  }

  async fetchUserPreferences(
    userId: string,
  ): Promise<{ preferences: UserCookingPreferences | null; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { preferences: null, error: "Cloud storage is not configured." };
    }

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return { preferences: null, error: error.message };
      if (!data) return { preferences: null };

      const preferences = userCookingPreferencesSchema.parse({
        defaultServings: data.default_servings,
        screenWake: data.screen_wake,
        soundAlerts: data.sound_alerts,
        readAloud: data.read_aloud,
        updatedAt: new Date(data.updated_at).getTime(),
      });

      return { preferences };
    } catch (e) {
      return {
        preferences: null,
        error: e instanceof Error ? e.message : "Failed to load preferences",
      };
    }
  }

  async saveUserPreferences(
    userId: string,
    prefs: UserCookingPreferences,
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Cloud storage is not configured." };
    }

    try {
      const { error } = await supabase.from("user_preferences").upsert(
        {
          user_id: userId,
          default_servings: prefs.defaultServings ?? null,
          screen_wake: prefs.screenWake,
          sound_alerts: prefs.soundAlerts,
          read_aloud: prefs.readAloud,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Failed to save preferences",
      };
    }
  }
}

/**
 * In-memory adapter for unit testing and offline development.
 */
export class MemorySyncAdapter implements RemoteSyncPort {
  readonly isCloudBacked = false;

  private shoppingStores = new Map<string, ShoppingList>();
  private historyStores = new Map<string, CookingHistoryEntry[]>();
  private prefsStores = new Map<string, UserCookingPreferences>();

  async syncShoppingList(
    userId: string,
    local: ShoppingList,
  ): Promise<{ list: ShoppingList; error?: string }> {
    const remote = this.shoppingStores.get(userId) ?? {
      id: `list_${userId}`,
      ownerId: userId,
      items: [],
      updatedAt: 0,
    };

    const { mergedList } = mergeShoppingLists(local, remote, { ownerId: userId });
    this.shoppingStores.set(userId, mergedList);
    return { list: mergedList };
  }

  async fetchCookingHistory(
    userId: string,
  ): Promise<{ entries: CookingHistoryEntry[]; error?: string }> {
    const entries = this.historyStores.get(userId) ?? [];
    return { entries: [...entries].sort((a, b) => b.startedAt - a.startedAt) };
  }

  async recordCookingHistory(
    userId: string,
    entry: CookingHistoryEntry,
  ): Promise<{ success: boolean; error?: string }> {
    const list = this.historyStores.get(userId) ?? [];
    const rest = list.filter((e) => e.sessionId !== entry.sessionId);
    this.historyStores.set(userId, [entry, ...rest]);
    return { success: true };
  }

  async fetchUserPreferences(
    userId: string,
  ): Promise<{ preferences: UserCookingPreferences | null; error?: string }> {
    return { preferences: this.prefsStores.get(userId) ?? DEFAULT_USER_PREFERENCES };
  }

  async saveUserPreferences(
    userId: string,
    prefs: UserCookingPreferences,
  ): Promise<{ success: boolean; error?: string }> {
    this.prefsStores.set(userId, prefs);
    return { success: true };
  }
}

let syncServiceInstance: RemoteSyncPort | null = null;

export function getRemoteSyncService(): RemoteSyncPort {
  if (!syncServiceInstance) {
    syncServiceInstance = isSupabaseConfigured()
      ? new SupabaseSyncAdapter()
      : new MemorySyncAdapter();
  }
  return syncServiceInstance;
}

export function setRemoteSyncService(service: RemoteSyncPort): void {
  syncServiceInstance = service;
}
