import { ChefHat, Clock, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, BackLinkFallback } from "@/features/recipes/BackLink";
import { CATEGORY_ICONS, iconForRecipe } from "@/features/recipes/category-icons";
import { RecordRecipeView } from "@/features/recipes/RecordRecipeView";
import { getCollectionRepository, getRecipeRepository } from "@/shared/data/catalog";
import { StoreError } from "@/shared/data/repositories";
import { categoryHref, getCategory } from "@/shared/domain/categories";
import { difficultyLabel, formatMinutes, isListable } from "@/shared/domain/discovery";
import type { Recipe } from "@/shared/domain/recipe-schema";
import { Badge } from "@/shared/ui/Badge";
import { Chip } from "@/shared/ui/Chip";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { EmptyState } from "@/shared/ui/States";

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

/** Static catalog: unknown slugs are a true 404. Revisit when a CMS adapter lands. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const recipes = await getRecipeRepository().list();
  return recipes.filter(isListable).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const recipe = await findRecipe((await params).slug);
  return { title: recipe?.title ?? "Recipe not found" };
}

/**
 * Recipe detail — stub. Real facts only (time, servings, difficulty if
 * set, categories) and
 * the view is recorded for Home's "Recently viewed". Ingredients,
 * Kitchen Check, and Start cooking arrive with the recipe-detail phase.
 */
export default async function RecipeDetailPage({ params }: Params) {
  const recipe = await findRecipe((await params).slug);
  if (!recipe) notFound();

  const { prep, cook, total } = recipe.timeMinutes;
  const time = formatMinutes(total);
  const difficulty = difficultyLabel(recipe.difficulty);
  const collectionTitles = Object.fromEntries(
    (await getCollectionRepository().list()).map((c) => [c.slug, c.title]),
  );

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <RecordRecipeView recipeId={recipe.id} />
      <Suspense fallback={<BackLinkFallback />}>
        <BackLink collectionTitles={collectionTitles} />
      </Suspense>
      <RecipeImage
        image={recipe.image}
        priority
        FallbackIcon={iconForRecipe(recipe.categories)}
        className="aspect-[4/3] w-full rounded-[32px] sm:aspect-[16/9]"
      />
      <div className="flex flex-col gap-3">
        {recipe.demo && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Demo</Badge>
            <span className="text-[13px] text-ink-500">
              Sample recipe for development. Not chef-tested.
            </span>
          </div>
        )}
        <h1 className="text-[30px] font-semibold leading-9 text-ink-900 sm:text-[34px] sm:leading-[42px]">
          {recipe.title}
        </h1>
        <ul className="flex flex-wrap gap-2 text-[14px] text-ink-900">
          {time && (
            <li className="tnum inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5">
              <Clock aria-hidden size={16} strokeWidth={1.75} />
              {time} total
              <span className="text-ink-500">
                ({prep} prep · {cook} cook)
              </span>
            </li>
          )}
          <li className="tnum inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5">
            <Users aria-hidden size={16} strokeWidth={1.75} />
            Serves {recipe.baseServings}
          </li>
          {difficulty && (
            <li className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5">
              <ChefHat aria-hidden size={16} strokeWidth={1.75} />
              <span className="sr-only">Difficulty: </span>
              {difficulty}
            </li>
          )}
        </ul>
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
      <EmptyState
        title="Full recipe view is on its way"
        message="Ingredients, Kitchen Check, and step-by-step Cooking Mode arrive in a later phase. This recipe is now in your Recently viewed on Home."
      />
    </article>
  );
}
