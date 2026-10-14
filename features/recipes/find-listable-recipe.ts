import { getRecipeRepository } from "@/shared/data/catalog";
import { StoreError } from "@/shared/data/repositories";
import { isListable } from "@/shared/domain/discovery";
import type { Recipe } from "@/shared/domain/recipe-schema";

/**
 * The recipe for a URL slug, or null when it doesn't exist or isn't
 * listable (drafts never surface to cooks).
 * Anything other than "not found" is a real failure and is rethrown.
 */
export async function findListableRecipe(slug: string): Promise<Recipe | null> {
  try {
    const recipe = await getRecipeRepository().getBySlug(slug);
    return isListable(recipe) ? recipe : null;
  } catch (error) {
    if (error instanceof StoreError && error.code === "not-found") return null;
    throw error;
  }
}

/** Slugs to pre-render: every listable recipe. */
export async function listableRecipeParams(): Promise<Array<{ slug: string }>> {
  const recipes = await getRecipeRepository().list();
  return recipes.filter(isListable).map((r) => ({ slug: r.slug }));
}
