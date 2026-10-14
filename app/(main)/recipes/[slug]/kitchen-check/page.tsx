import { findListableRecipe, listableRecipeParams } from "@/features/recipes/find-listable-recipe";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KitchenCheckScreen } from "@/features/kitchen-check/KitchenCheckScreen";
import { getIngredientRepository } from "@/shared/data/catalog";

import { Loading } from "@/shared/ui/States";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export const generateStaticParams = listableRecipeParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await findListableRecipe((await params).slug);
  return { title: recipe ? `Kitchen Check · ${recipe.title}` : "Recipe not found" };
}

/**
 * Kitchen Check route. Static: the serving count arrives as `?servings=`
 * and is read on the client, the same way the recipe back link reads
 * `?from=`.
 */
export default async function KitchenCheckPage({ params }: Params) {
  const recipe = await findListableRecipe((await params).slug);
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
