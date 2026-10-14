"use client";

import { z } from "zod";
import {
  cookingSessionSchema,
  isResumable,
  pickResumable,
  type CookingSession,
} from "@/shared/domain/session";
import { recentViewSchema, recordView, type RecentView } from "@/shared/domain/history";
import { savedRecipeSchema, type SavedRecipe } from "@/shared/domain/user";
import { salvageSavedEntries, sortSaved, withSaved, withoutSaved } from "@/shared/domain/saved";
import { shoppingListSchema, type ShoppingList } from "@/shared/domain/shopping";
import {
  kitchenCheckRecordSchema,
  upsertRecord,
  type KitchenCheckRecord,
} from "@/shared/domain/kitchen-check";
import {
  cookingHistoryEntrySchema,
  type CookingHistoryEntry,
  mergeCookingHistory,
} from "@/shared/domain/cooking-history";
import {
  userCookingPreferencesSchema,
  type UserCookingPreferences,
  DEFAULT_USER_PREFERENCES,
} from "@/shared/domain/preferences";
import { cachedRecipeEntrySchema, type CachedRecipeEntry } from "@/shared/domain/recipe-cache";
import type { Recipe } from "@/shared/domain/recipe-schema";
import type {
  HistoryRepository,
  KitchenCheckRepository,
  RecipeCacheRepository,
  SavedRepository,
  SessionRepository,
  ShoppingRepository,
} from "./repositories";
import { StoreError } from "./repositories";

/**
 * localStorage adapters (MVP minimum). Every read revalidates
 * against the Zod schema — corrupt or version-skewed payloads
 * fall back to empty state instead of crashing.
 *
 * IndexedDB (for large session histories) is deferred until a
 * real feature needs it; payloads here are small.
 */

function read<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === "undefined" || !("localStorage" in window)) return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Storage blocked (privacy mode, disabled site data) — behave as empty.
    return null;
  }
  if (!raw) return null;
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore — the corrupt value is simply re-read as empty next time.
    }
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new StoreError("unavailable", "local storage is full or blocked");
  }
}

const SESSIONS_KEY = "kooking:sessions:v1";
const LISTS_KEY = "kooking:lists:v1";
const RECENT_KEY = "kooking:recent:v1";
/** Shared with the saved-recipes store so other tabs' changes can be picked up. */
export const SAVED_KEY = "kooking:saved:v1";
const KITCHEN_CHECK_KEY = "kooking:kitchen-check:v1";
export const COOKING_HISTORY_KEY = "kooking:cooking-history:v1";
export const PREFERENCES_KEY = "kooking:prefs:v1";
export const RECIPE_CACHE_KEY = "kooking:cached-recipes:v1";

interface RawArray {
  entries: unknown[];
  /** The stored text when it couldn't be read as an array (kept for backup). */
  unreadable: string | null;
}

/** Raw JSON array under `key`; [] when absent or blocked. Never throws. */
function readArray(key: string): RawArray {
  if (typeof window === "undefined" || !("localStorage" in window)) {
    return { entries: [], unreadable: null };
  }
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return { entries: [], unreadable: null };
  }
  if (!raw) return { entries: [], unreadable: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? { entries: parsed, unreadable: null }
      : { entries: [], unreadable: raw };
  } catch {
    return { entries: [], unreadable: raw };
  }
}

const MAX_FINISHED_SESSIONS = 30;
const MAX_DAMAGED_SESSIONS = 10;
export const SESSIONS_BACKUP_PREFIX = `${SESSIONS_KEY}:backup:`;

const idOf = (e: unknown) =>
  typeof e === "object" && e !== null && typeof (e as { id?: unknown }).id === "string"
    ? (e as { id: string }).id
    : null;

/**
 * Cooking sessions on this device.
 *
 * Recovery guarantees:
 * - Entries are validated one by one; a damaged entry never hides the
 *   others and is never dropped by a later save — only `remove(id)`
 *   deletes it, after the cook chooses to.
 * - If the whole stored value is unreadable, it is copied to a backup
 *   key before anything is written over it. If that backup can't be
 *   made, the save fails rather than destroy the data.
 */
export class LocalSessions implements SessionRepository {
  private parsed(): { valid: CookingSession[]; damaged: unknown[]; unreadable: string | null } {
    const { entries, unreadable } = readArray(SESSIONS_KEY);
    const valid: CookingSession[] = [];
    const damaged: unknown[] = [];
    for (const entry of entries) {
      const r = cookingSessionSchema.safeParse(entry);
      if (r.success) valid.push(r.data);
      else damaged.push(entry);
    }
    return { valid, damaged, unreadable };
  }

  private all(): CookingSession[] {
    return this.parsed().valid;
  }

  async latestForRecipe(recipeId: string): Promise<CookingSession | null> {
    const candidates = this.all()
      .filter((s) => s.recipeId === recipeId && isResumable(s))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return candidates[0] ?? null;
  }

  async latestResumable(): Promise<CookingSession | null> {
    return pickResumable(this.all());
  }

  /** Every active or paused session, most recently used first. */
  async listResumable(): Promise<CookingSession[]> {
    return this.all()
      .filter(isResumable)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Stored entries that failed validation, for recovery screens. */
  async listDamaged(): Promise<unknown[]> {
    return this.parsed().damaged;
  }

  async getById(id: string): Promise<CookingSession> {
    const found = this.all().find((s) => s.id === id);
    if (!found) throw new StoreError("not-found", `session '${id}' not found`);
    return found;
  }

  /** Unvalidated entry for `id`, so the caller can tell "corrupt" from "missing". */
  async getRaw(id: string): Promise<unknown | null> {
    return readArray(SESSIONS_KEY).entries.find((e) => idOf(e) === id) ?? null;
  }

  private backupUnreadable(unreadable: string | null) {
    if (unreadable === null) return;
    try {
      window.localStorage.setItem(`${SESSIONS_BACKUP_PREFIX}${Date.now()}`, unreadable);
    } catch {
      throw new StoreError(
        "unavailable",
        "saved sessions are unreadable and couldn't be backed up, so nothing was overwritten",
      );
    }
  }

  /** Keeps every open session and damaged entry; trims finished history. */
  async store(session: CookingSession): Promise<void> {
    const next = cookingSessionSchema.parse(session);
    const { valid, damaged, unreadable } = this.parsed();
    this.backupUnreadable(unreadable);
    const all = [...valid.filter((s) => s.id !== next.id), next];
    const open = all.filter(isResumable);
    const finished = all
      .filter((s) => !isResumable(s))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_FINISHED_SESSIONS);
    const keptDamaged = damaged.filter((d) => idOf(d) !== next.id).slice(-MAX_DAMAGED_SESSIONS);
    write(SESSIONS_KEY, [...open, ...finished, ...keptDamaged]);
  }

  /** Delete one entry (valid or damaged). Only on an explicit user action. */
  async remove(id: string): Promise<void> {
    const { entries, unreadable } = readArray(SESSIONS_KEY);
    this.backupUnreadable(unreadable);
    write(
      SESSIONS_KEY,
      entries.filter((e) => idOf(e) !== id),
    );
  }
}

export class LocalShopping implements ShoppingRepository {
  private all(): ShoppingList[] {
    return read(LISTS_KEY, z.array(shoppingListSchema)) ?? [];
  }

  async load(ownerId: string): Promise<ShoppingList | null> {
    return this.all().find((l) => l.ownerId === ownerId) ?? null;
  }

  async store(list: ShoppingList): Promise<void> {
    const rest = this.all().filter((l) => l.ownerId !== list.ownerId);
    write(LISTS_KEY, [...rest, list]);
  }
}

export class LocalHistory implements HistoryRepository {
  async list(): Promise<RecentView[]> {
    return read(RECENT_KEY, z.array(recentViewSchema)) ?? [];
  }

  async record(recipeId: string, now: number): Promise<void> {
    write(RECENT_KEY, recordView(await this.list(), recipeId, now));
  }
}

/**
 * Saved recipes on this device (Phase 33). Unlike the generic `read`,
 * a damaged list is salvaged entry by entry rather than discarded, and
 * storage that can't be read at all is reported (StoreError
 * "unavailable") so the UI can say so instead of showing an empty list.
 */
export class LocalSaved implements SavedRepository {
  constructor(private readonly key: string = SAVED_KEY) {}

  private all(): SavedRecipe[] {
    if (typeof window === "undefined") return [];
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(this.key);
    } catch {
      throw new StoreError("unavailable", "local storage is blocked");
    }
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null; // unreadable text: nothing to salvage
    }
    const { entries, dropped } = salvageSavedEntries(parsed);
    if (dropped > 0 || parsed === null) {
      // Rewrite the cleaned list so the damage doesn't linger. Best effort.
      try {
        window.localStorage.setItem(this.key, JSON.stringify(entries));
      } catch {
        // Read-only or full: keep using the salvaged copy in memory.
      }
    }
    return entries;
  }

  async list(ownerId: string): Promise<SavedRecipe[]> {
    return sortSaved(this.all().filter((s) => s.ownerId === ownerId));
  }

  async listIds(ownerId: string): Promise<string[]> {
    return (await this.list(ownerId)).map((s) => s.recipeId);
  }

  async save(entry: SavedRecipe): Promise<void> {
    write(this.key, withSaved(this.all(), savedRecipeSchema.parse(entry)));
  }

  async unsave(ownerId: string, recipeId: string): Promise<void> {
    write(this.key, withoutSaved(this.all(), ownerId, recipeId));
  }
}

/** Per-device Kitchen Check answers, one record per recipe version + servings. */
export class LocalKitchenChecks implements KitchenCheckRepository {
  private all(): KitchenCheckRecord[] {
    return read(KITCHEN_CHECK_KEY, z.array(kitchenCheckRecordSchema)) ?? [];
  }

  async load(key: string): Promise<KitchenCheckRecord | null> {
    return this.all().find((r) => r.key === key) ?? null;
  }

  async store(record: KitchenCheckRecord): Promise<void> {
    write(KITCHEN_CHECK_KEY, upsertRecord(this.all(), record));
  }
}

const MAX_HISTORY_ENTRIES = 50;

/**
 * Local Cooking History (Phase 35).
 * Stores finished/ended cooking records on this device.
 */
export class LocalCookingHistory {
  private all(): CookingHistoryEntry[] {
    return read(COOKING_HISTORY_KEY, z.array(cookingHistoryEntrySchema)) ?? [];
  }

  async list(): Promise<CookingHistoryEntry[]> {
    return this.all().sort((a, b) => b.startedAt - a.startedAt);
  }

  async record(entry: CookingHistoryEntry): Promise<void> {
    const valid = cookingHistoryEntrySchema.parse(entry);
    const existing = this.all();
    const merged = mergeCookingHistory(existing, [valid]).slice(0, MAX_HISTORY_ENTRIES);
    write(COOKING_HISTORY_KEY, merged);
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    try {
      window.localStorage.removeItem(COOKING_HISTORY_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Local User Preferences (Phase 35).
 */
export class LocalPreferences {
  async load(): Promise<UserCookingPreferences> {
    return read(PREFERENCES_KEY, userCookingPreferencesSchema) ?? DEFAULT_USER_PREFERENCES;
  }

  async store(prefs: UserCookingPreferences): Promise<void> {
    const valid = userCookingPreferencesSchema.parse(prefs);
    write(PREFERENCES_KEY, valid);
  }
}

/**
 * Clears private account data from this device upon sign-out to ensure
 * zero data leakage into subsequent guest sessions.
 */
export function clearAccountLocalData(userId?: string): void {
  if (typeof window === "undefined" || !("localStorage" in window)) return;

  try {
    // 1. Clear private cooking history cache
    window.localStorage.removeItem(COOKING_HISTORY_KEY);

    // 2. Clear user-specific shopping lists
    if (userId) {
      const raw = window.localStorage.getItem(LISTS_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const retained = parsed.filter(
              (item: { ownerId?: string }) => item && item.ownerId !== userId,
            );
            window.localStorage.setItem(LISTS_KEY, JSON.stringify(retained));
          }
        } catch {
          window.localStorage.removeItem(LISTS_KEY);
        }
      }
    }
  } catch {
    // Best effort cleanup
  }
}

const MAX_CACHED_RECIPES = 30;

/**
 * Local cache of full structured recipes on this device (Phase 36).
 * Ensures that steps, ingredient scaling, sensory cues, equipment,
 * and timers are accessible even when completely offline.
 */
export class LocalRecipeCache implements RecipeCacheRepository {
  private all(): CachedRecipeEntry[] {
    const raw = read(RECIPE_CACHE_KEY, z.array(cachedRecipeEntrySchema));
    return raw ?? [];
  }

  async list(): Promise<CachedRecipeEntry[]> {
    return this.all().sort((a, b) => b.cachedAt - a.cachedAt);
  }

  async get(recipeId: string): Promise<CachedRecipeEntry | null> {
    return this.all().find((c) => c.recipe.id === recipeId) ?? null;
  }

  async getBySlug(slug: string): Promise<CachedRecipeEntry | null> {
    return this.all().find((c) => c.recipe.slug === slug) ?? null;
  }

  async save(recipe: Recipe, cachedAt: number = Date.now()): Promise<void> {
    const entry: CachedRecipeEntry = {
      recipe,
      cachedAt,
      version: 1,
    };
    const rest = this.all().filter((c) => c.recipe.id !== recipe.id);
    const updated = [entry, ...rest].slice(0, MAX_CACHED_RECIPES);
    write(RECIPE_CACHE_KEY, updated);
  }

  async remove(recipeId: string): Promise<void> {
    const rest = this.all().filter((c) => c.recipe.id !== recipeId);
    write(RECIPE_CACHE_KEY, rest);
  }
}
