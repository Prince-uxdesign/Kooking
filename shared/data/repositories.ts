import type { Recipe, ReusableIngredient } from "@/shared/domain/recipe-schema";
import type { ShoppingList } from "@/shared/domain/shopping";
import type { CookingSession } from "@/shared/domain/session";
import type { SavedRecipe } from "@/shared/domain/user";
import type { RecentView } from "@/shared/domain/history";
import type { Collection } from "@/shared/domain/collections";

/**
 * Repository interfaces (Phase 1 §3). Features depend on these —
 * never on storage APIs. Local adapters today, Supabase adapters
 * later, without touching callers.
 */

export class StoreError extends Error {
  readonly code: "not-found" | "unavailable" | "invalid" | "conflict";
  constructor(code: StoreError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export interface RecipeRepository {
  list(): Promise<Recipe[]>;
  getById(id: string): Promise<Recipe>;
  getBySlug(slug: string): Promise<Recipe>;
}

export interface ManageableRecipeRepository extends RecipeRepository {
  create(recipe: Recipe): Promise<Recipe>;
  update(recipe: Recipe): Promise<Recipe>;
  delete?(id: string): Promise<void>;
}

export interface SavedRepository {
  listIds(ownerId: string): Promise<string[]>;
  save(entry: SavedRecipe): Promise<void>;
  unsave(ownerId: string, recipeId: string): Promise<void>;
}

export interface ShoppingRepository {
  load(ownerId: string): Promise<ShoppingList | null>;
  store(list: ShoppingList): Promise<void>;
}

export interface SessionRepository {
  latestForRecipe(recipeId: string): Promise<CookingSession | null>;
  /** Most recently updated active/paused session across all recipes. */
  latestResumable(): Promise<CookingSession | null>;
  getById(id: string): Promise<CookingSession>;
  store(session: CookingSession): Promise<void>;
}

/** Device-local viewing history (ids + timestamps only). */
export interface HistoryRepository {
  list(): Promise<RecentView[]>;
  record(recipeId: string, now: number): Promise<void>;
}

/** Curated collection definitions (rules, never recipe copies). */
export interface CollectionRepository {
  list(): Promise<Collection[]>;
  getBySlug(slug: string): Promise<Collection>;
}

/** Ingredient identities (names, aliases) that recipe lines reference by id. */
export interface IngredientRepository {
  list(): Promise<ReusableIngredient[]>;
}
