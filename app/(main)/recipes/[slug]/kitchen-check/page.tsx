import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KitchenCheckScreen } from "@/features/kitchen-check/KitchenCheckScreen";
import { getIngredientRepository, getRecipeRepository } from "@/shared/data/catalog";
import { StoreError } from "@/shared/data/repositories";
import { isListable } from "@/shared/domain/discovery";
import type { Recipe } from "@/shared/domain/recipe-schema";
import { Loading } from "@/shared/ui/States";

type Params = { params: Promise<{ slug: string }> };

async function findRecipe(slug: string): Promise<Recipe | null> {
  try {
    const recipe = await getRecipeRepository().getBySlug(slug);
    return isListable(recipe) ? recipe : null;
  } catch (error) {
    if (error instanceof StoreError && error.code === "not-found") return null;
    throw error;
  }
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const recipes = await getRecipeRepository().list();
  return recipes.filter(isListable).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await findRecipe((await params).slug);
  return { title: recipe ? `Kitchen Check · ${recipe.title}` : "Recipe not found" };
}

/**
 * Kitchen Check route. Static: the serving count arrives as `?servings=`
 * and is read on the client, the same way the recipe back link reads
 * `?from=`.
 */
export default async function KitchenCheckPage({ params }: Params) {
  const recipe = await findRecipe((await params).slug);
  if (!recipe) notFound();

  const ingredients = await getIngredientRepository().list();
  const ingredientNames = Object.fromEntries(ingredients.map((i) => [i.id, i.name]));
  const ingredientCategories = Object.fromEntries(ingredients.map((i) => [i.id, i.category]));

  return (
    <Suspense fallback={<Loading label="Loading Kitchen Check…" />}>
      <KitchenCheckScreen
        recipe={recipe}
        ingredientNames={ingredientNames}
        ingredientCategories={ingredientCategories}
      />
    </Suspense>
  );
}
