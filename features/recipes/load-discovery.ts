import {
  getCollectionRepository,
  getIngredientRepository,
  getRecipeRepository,
} from "@/shared/data/catalog";
import type { Collection } from "@/shared/domain/collections";
import { isListable } from "@/shared/domain/discovery";
import type { Recipe, ReusableIngredient } from "@/shared/domain/recipe-schema";

export type Discovery =
  | {
      ok: true;
      recipes: Recipe[];
      collections: Collection[];
      ingredients: ReusableIngredient[];
    }
  | { ok: false };

/**
 * Everything Explore pages read: listable recipes (catalog order),
 * collection definitions, and the ingredient catalog (for search).
 * Failures become an error state, never a crash.
 */
export async function loadDiscovery(): Promise<Discovery> {
  try {
    const [recipes, collections, ingredients] = await Promise.all([
      getRecipeRepository().list(),
      getCollectionRepository().list(),
      getIngredientRepository().list(),
    ]);
    return { ok: true, recipes: recipes.filter(isListable), collections, ingredients };
  } catch {
    return { ok: false };
  }
}
