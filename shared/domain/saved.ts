import type { RecipeSummary } from "./discovery";
import { normalize, tokenize } from "./search";
import { savedRecipeSchema, type SavedRecipe } from "./user";

/**
 * Saved recipes (Phase 33). Pure rules shared by every storage adapter:
 * local storage today, an account-backed store later. Entries hold only
 * the stable recipe id, the owner and when it was saved; titles, photos
 * and availability always come from the live catalog.
 */

/** The owner for anonymous use. An account id replaces this once sign-in exists. */
export const GUEST_OWNER = "guest";

/**
 * Read whatever was stored, keeping every entry that's valid. One bad
 * entry never costs the cook the rest of their list. Duplicates (same
 * owner and recipe) collapse to the most recent save.
 */
export function salvageSavedEntries(raw: unknown): { entries: SavedRecipe[]; dropped: number } {
  if (!Array.isArray(raw)) return { entries: [], dropped: raw == null ? 0 : 1 };
  const byKey = new Map<string, SavedRecipe>();
  let dropped = 0;
  for (const item of raw) {
    const parsed = savedRecipeSchema.safeParse(item);
    if (!parsed.success) {
      dropped++;
      continue;
    }
    const key = `${parsed.data.ownerId}\u0000${parsed.data.recipeId}`;
    const existing = byKey.get(key);
    if (existing) dropped++;
    if (!existing || parsed.data.savedAt > existing.savedAt) byKey.set(key, parsed.data);
  }
  return { entries: [...byKey.values()], dropped };
}

/** Newest first, then by id so the order is stable. */
export function sortSaved(entries: SavedRecipe[]): SavedRecipe[] {
  return [...entries].sort((a, b) => b.savedAt - a.savedAt || a.recipeId.localeCompare(b.recipeId));
}

/** Add or refresh one entry; never creates a duplicate. */
export function withSaved(entries: SavedRecipe[], entry: SavedRecipe): SavedRecipe[] {
  return [
    ...entries.filter((e) => !(e.ownerId === entry.ownerId && e.recipeId === entry.recipeId)),
    entry,
  ];
}

export function withoutSaved(
  entries: SavedRecipe[],
  ownerId: string,
  recipeId: string,
): SavedRecipe[] {
  return entries.filter((e) => !(e.ownerId === ownerId && e.recipeId === recipeId));
}

export interface ResolvedSaved {
  /** Saved recipes still in the catalog, newest save first. */
  available: RecipeSummary[];
  /** Saved ids the catalog no longer lists (removed or unpublished). */
  unavailable: string[];
}

/** Match saved ids against the listable catalog. */
export function resolveSaved(entries: SavedRecipe[], catalog: RecipeSummary[]): ResolvedSaved {
  const byId = new Map(catalog.map((r) => [r.id, r]));
  const available: RecipeSummary[] = [];
  const unavailable: string[] = [];
  for (const e of sortSaved(entries)) {
    const recipe = byId.get(e.recipeId);
    if (recipe) available.push(recipe);
    else unavailable.push(e.recipeId);
  }
  return { available, unavailable };
}

/** Narrow a saved list by title or category words ("rice", "soup"). Order is kept. */
export function filterSaved(recipes: RecipeSummary[], query: string): RecipeSummary[] {
  const words = tokenize(query);
  if (words.length === 0) return recipes;
  return recipes.filter((r) => {
    const haystack = normalize([r.title, ...(r.categories ?? [])].join(" "));
    return words.every((w) => haystack.includes(w));
  });
}

/** Above this many, the Saved screen offers a filter field. */
export const SAVED_FILTER_THRESHOLD = 6;
