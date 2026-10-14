"use client";

import { z } from "zod";
import { cookingSessionSchema, pickResumable, type CookingSession } from "@/shared/domain/session";
import { recentViewSchema, recordView, type RecentView } from "@/shared/domain/history";
import { savedRecipeSchema, type SavedRecipe } from "@/shared/domain/user";
import { shoppingListSchema, type ShoppingList } from "@/shared/domain/shopping";
import type {
  HistoryRepository,
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
const SAVED_KEY = "kooking:saved:v1";

export class LocalSessions implements SessionRepository {
  private all(): CookingSession[] {
    return read(SESSIONS_KEY, z.array(cookingSessionSchema)) ?? [];
  }

  async latestForRecipe(recipeId: string): Promise<CookingSession | null> {
    const candidates = this.all()
      .filter((s) => s.recipeId === recipeId && s.status !== "completed")
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return candidates[0] ?? null;
  }

  async latestResumable(): Promise<CookingSession | null> {
    return pickResumable(this.all());
  }

  async getById(id: string): Promise<CookingSession> {
    const found = this.all().find((s) => s.id === id);
    if (!found) throw new StoreError("not-found", `session '${id}' not found`);
    return found;
  }

  async store(session: CookingSession): Promise<void> {
    const rest = this.all().filter((s) => s.id !== session.id);
    write(SESSIONS_KEY, [...rest, session].slice(-20));
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

export class LocalSaved implements SavedRepository {
  private all(): SavedRecipe[] {
    return read(SAVED_KEY, z.array(savedRecipeSchema)) ?? [];
  }

  async listIds(ownerId: string): Promise<string[]> {
    return this.all()
      .filter((s) => s.ownerId === ownerId)
      .map((s) => s.recipeId);
  }

  async save(entry: SavedRecipe): Promise<void> {
    const rest = this.all().filter(
      (s) => !(s.ownerId === entry.ownerId && s.recipeId === entry.recipeId),
    );
    write(SAVED_KEY, [...rest, entry]);
  }

  async unsave(ownerId: string, recipeId: string): Promise<void> {
    const rest = this.all().filter((s) => !(s.ownerId === ownerId && s.recipeId === recipeId));
    write(SAVED_KEY, rest);
  }
}
