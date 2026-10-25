import { findListableRecipe, listableRecipeParams } from "@/features/recipes/find-listable-recipe";
import { ChefHat, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, BackLinkFallback } from "@/features/recipes/BackLink";
import { CATEGORY_ICONS, iconForRecipe } from "@/features/recipes/category-icons";
import { RecipeDetailInteractive } from "@/features/recipes/RecipeDetailInteractive";
import { RecipeDetailWithParams } from "@/features/recipes/RecipeDetailWithParams";
import { RecordRecipeView } from "@/features/recipes/RecordRecipeView";
import { SaveButton } from "@/features/saved/SaveButton";
import {
  getCollectionRepository,
  getIngredientRepository,
  getRecipeRepository,
} from "@/shared/data/catalog";

import { categoryHref, getCategory } from "@/shared/domain/categories";
import { difficultyLabel, formatMinutes, isListable, toSummary } from "@/shared/domain/discovery";

import { Badge } from "@/shared/ui/Badge";
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

  const { total } = recipe.timeMinutes;
  const time = formatMinutes(total);
  const difficulty = difficultyLabel(recipe.difficulty);

  // Related recipes: other listable recipes sharing category or catalog
  const relatedRecipes = allRecipes
    .filter((r) => r.id !== recipe.id && isListable(r))
    .filter((r) => r.categories.some((c) => recipe.categories.includes(c)))
    .map(toSummary)
    .slice(0, 4);

  const facts = [
    time && {
      icon: <Clock aria-hidden size={18} strokeWidth={1.75} />,
      value: time,
      label: "Total time",
      sr: "Total time: ",
    },
    {
      icon: <Users aria-hidden size={18} strokeWidth={1.75} />,
      value: `Serves ${recipe.baseServings}`,
      label: "Scale it below",
      sr: "",
    },
    difficulty && {
      icon: <ChefHat aria-hidden size={18} strokeWidth={1.75} />,
      value: difficulty,
      label: "Difficulty",
      sr: "Difficulty: ",
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; value: string; label: string; sr: string }>;

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-28 sm:gap-10 sm:pb-12">
      <RecordRecipeView recipeId={recipe.id} recipe={recipe} />

      <div>
        {/* Photo first, edge to edge on phones, with the way back and save on top. */}
        <div className="relative -mx-5 overflow-hidden bg-surface-200 sm:mx-0 sm:rounded-[32px]">
          <RecipeImage
            image={recipe.image}
            priority
            FallbackIcon={iconForRecipe(recipe.categories)}
            className="aspect-[5/4] w-full sm:aspect-[16/9] lg:aspect-[21/9] lg:max-h-[440px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-900/35 to-transparent"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
            <Suspense fallback={<BackLinkFallback />}>
              <BackLink collectionTitles={collectionTitles} />
            </Suspense>
            <SaveButton recipeId={recipe.id} title={recipe.title} variant="card" />
          </div>
          {recipe.demo && (
            <span className="absolute bottom-10 left-4 z-10 rounded-full bg-white px-3 py-1 text-[0.8125rem] font-semibold text-ink-900 sm:bottom-4">
              Demo Recipe
            </span>
          )}
        </div>

        {/* The sheet: slides up over the photo on phones. */}
        <div className="relative -mx-5 -mt-7 flex flex-col gap-4 rounded-t-[32px] bg-surface-50 px-5 pt-7 sm:mx-0 sm:mt-0 sm:rounded-none sm:bg-transparent sm:px-0 sm:pt-8">
          <ul aria-label="Categories" className="flex flex-wrap gap-2">
            {recipe.categories.map((id) => {
              const Icon = CATEGORY_ICONS[id];
              return (
                <li key={id}>
                  <Link
                    href={categoryHref(id)}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-primary-50 px-3 text-[0.8125rem] font-medium text-primary-800 transition-colors hover:bg-primary-100"
                  >
                    <Icon aria-hidden size={14} strokeWidth={1.75} />
                    {getCategory(id).label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {recipe.demo && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Demo Content</Badge>
              <span className="text-[0.8125rem] text-ink-500">
                Sample recipe for development and testing. Not chef-approved.
              </span>
            </div>
          )}

          <h1 className="font-headline text-[2.125rem] font-medium leading-[1.02] tracking-[-0.03em] text-ink-900 sm:text-[2.75rem]">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="max-w-3xl text-[1rem] leading-7 text-ink-600">{recipe.description}</p>
          )}

          {/* Three facts at a glance */}
          <ul className="mt-1 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            {facts.map((f) => (
              <li
                key={f.value}
                className="card-edge flex flex-col gap-2 rounded-[20px] bg-white p-3 sm:p-4"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                  {f.icon}
                </span>
                <span className="flex flex-col">
                  <span className="tnum text-[0.9375rem] font-semibold leading-5 text-ink-900">
                    {f.sr && <span className="sr-only">{f.sr}</span>}
                    {f.value}
                  </span>
                  <span className="text-[0.75rem] leading-4 text-ink-500">{f.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
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
