import { getCollectionRepository, getRecipeRepository } from "@/shared/data/catalog";
import type { Collection } from "@/shared/domain/collections";
import { isListable } from "@/shared/domain/discovery";
import type { Recipe } from "@/shared/domain/recipe-schema";

export type Discovery = { ok: true; recipes: Recipe[]; collections: Collection[] } | { ok: false };

/**
 * Everything Explore pages read: listable recipes (catalog order) and
 * collection definitions. Failures become an error state, never a crash.
 */
export async function loadDiscovery(): Promise<Discovery> {
  try {
    const [recipes, collections] = await Promise.all([
      getRecipeRepository().list(),
      getCollectionRepository().list(),
    ]);
    return { ok: true, recipes: recipes.filter(isListable), collections };
  } catch {
    return { ok: false };
  }
}
