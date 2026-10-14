import { findListableRecipe, listableRecipeParams } from "@/features/recipes/find-listable-recipe";
import { ChefHat, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, BackLinkFallback } from "@/features/recipes/BackLink";
import { CATEGORY_ICONS, iconForRecipe } from "@/features/recipes/category-icons";
import { RecipeDetailInteractive } from "@/features/recipes/RecipeDetailInteractive";
import { RecipeDetailWithParams } from "@/features/recipes/RecipeDetailWithParams";
import { RecordRecipeView } from "@/features/recipes/RecordRecipeView";
import {
  getCollectionRepository,
  getIngredientRepository,
  getRecipeRepository,
} from "@/shared/data/catalog";

import { categoryHref, getCategory } from "@/shared/domain/categories";
import { difficultyLabel, formatMinutes, isListable, toSummary } from "@/shared/domain/discovery";

import { Badge } from "@/shared/ui/Badge";
import { Chip } from "@/shared/ui/Chip";
import { RecipeCollectionSection } from "@/shared/ui/RecipeCollectionSection";
import { RecipeImage } from "@/shared/ui/RecipeImage";

type Params = { params: Promise<{ slug: string }> };

/** Static catalog: unknown slugs are a true 404. Revisit when a CMS adapter lands. */
export const dynamicParams = false;

export const generateStaticParams = listableRecipeParams;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await findListableRecipe((await params).slug);
  return {
    title: recipe ? recipe.title : "Recipe not found",
    description: recipe?.description ?? "Authentic Nigerian recipe instructions and ingredients.",
  };
}

/**
 * Recipe Detail Page (Phase 11):
 * Comprehensive overview answering:
 * 1. What is this meal? (Title, photo, description, category)
 * 2. Is it suitable? (Difficulty, total/prep/cook times)
 * 3. What do I need? (Interactive ingredients list with servings scaling)
 * 4. How much time will it take? (Detailed time breakdown)
 * 5. How many will it serve? (Servings scaling)
 * 6. What equipment will I need? (Equipment derived from recipe steps)
 * 7. What happens when I am ready? (Kitchen Check integration & Start Cooking)
 */
export default async function RecipeDetailPage({ params }: Params) {
  const { slug } = await params;
  const recipe = await findListableRecipe(slug);
  if (!recipe) notFound();

  const [ingredientsList, collectionsList, allRecipes] = await Promise.all([
    getIngredientRepository().list(),
    getCollectionRepository().list(),
    getRecipeRepository().list(),
  ]);

  const ingredientNames = Object.fromEntries(ingredientsList.map((i) => [i.id, i.name]));
  const collectionTitles = Object.fromEntries(collectionsList.map((c) => [c.slug, c.title]));

  const { prep, cook, total } = recipe.timeMinutes;
  const time = formatMinutes(total);
  const prepTime = formatMinutes(prep);
  const cookTime = formatMinutes(cook);
  const difficulty = difficultyLabel(recipe.difficulty);

  // Related recipes: other listable recipes sharing category or catalog
  const relatedRecipes = allRecipes
    .filter((r) => r.id !== recipe.id && isListable(r))
    .filter((r) => r.categories.some((c) => recipe.categories.includes(c)))
    .map(toSummary)
    .slice(0, 4);

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-20 sm:gap-10 sm:pb-12">
      <RecordRecipeView recipeId={recipe.id} recipe={recipe} />

      <Suspense fallback={<BackLinkFallback />}>
        <BackLink collectionTitles={collectionTitles} />
      </Suspense>

      {/* Main Image Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-surface-200">
        <RecipeImage
          image={recipe.image}
          priority
          FallbackIcon={iconForRecipe(recipe.categories)}
          className="aspect-[4/3] w-full rounded-[32px] sm:aspect-[16/9] lg:aspect-[21/9] lg:max-h-[420px]"
        />
        {recipe.demo && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-white px-3 py-1 text-[0.8125rem] font-semibold text-ink-900 shadow-none">
            Demo Recipe
          </span>
        )}
      </div>

      {/* Title & Overview Meta Header */}
      <div className="flex flex-col gap-4">
        {recipe.demo && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Demo Content</Badge>
            <span className="text-[0.8125rem] text-ink-500">
              Sample recipe for development and testing. Not chef-approved.
            </span>
          </div>
        )}

        <h1 className="text-[1.875rem] font-semibold leading-9 text-ink-900 sm:text-[2.25rem] sm:leading-[44px]">
          {recipe.title}
        </h1>

        {recipe.description && (
          <p className="max-w-3xl text-[1rem] leading-7 text-ink-600">{recipe.description}</p>
        )}

        {/* Fact Pills */}
        <ul className="flex flex-wrap gap-2 pt-1 text-[0.875rem] text-ink-900">
          {time && (
            <li className="tnum inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5">
              <Clock aria-hidden size={16} strokeWidth={1.75} />
              <span className="font-medium">{time} total</span>
              {prepTime && cookTime && (
                <span className="text-ink-500">
                  ({prepTime} prep · {cookTime} cook)
                </span>
              )}
            </li>
          )}

          <li className="tnum inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5">
            <Users aria-hidden size={16} strokeWidth={1.75} />
            <span>Serves {recipe.baseServings}</span>
          </li>

          {difficulty && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5">
              <ChefHat aria-hidden size={16} strokeWidth={1.75} />
              <span className="sr-only">Difficulty: </span>
              <span>{difficulty}</span>
            </li>
          )}
        </ul>

        {/* Categories */}
        <ul aria-label="Categories" className="flex flex-wrap gap-2 pt-1">
          {recipe.categories.map((id) => {
            const Icon = CATEGORY_ICONS[id];
            return (
              <li key={id}>
                <Chip href={categoryHref(id)} icon={<Icon size={18} strokeWidth={1.75} />}>
                  {getCategory(id).label}
                </Chip>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Interactive Core: Ingredients, Servings, Prep, Equipment, Steps, Kitchen Check */}
      <Suspense
        fallback={<RecipeDetailInteractive recipe={recipe} ingredientNames={ingredientNames} />}
      >
        <RecipeDetailWithParams recipe={recipe} ingredientNames={ingredientNames} />
      </Suspense>

      {/* Related Recipes Section */}
      {relatedRecipes.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="mt-6 border-t border-line-default pt-10"
        >
          <RecipeCollectionSection
            id="related-heading"
            title="You might also like"
            description="More recipes in this category"
            recipes={relatedRecipes}
            from={`/recipes/${recipe.slug}`}
            layout="horizontal"
          />
        </section>
      )}
    </article>
  );
}
