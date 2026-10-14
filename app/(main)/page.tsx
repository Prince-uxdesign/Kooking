import Link from "next/link";
import { CategoryGrid } from "@/features/home/CategoryGrid";
import { ContinueCooking } from "@/features/home/ContinueCooking";
import { FeaturedMeal } from "@/features/home/FeaturedMeal";
import { HomeGreeting } from "@/features/home/HomeGreeting";
import { RecipeSearchForm } from "@/features/recipes/RecipeSearchForm";
import { RecentlyViewed } from "@/features/home/RecentlyViewed";
import { RecipeCollection } from "@/features/home/RecipeCollection";
import { SavedShortcut } from "@/features/home/SavedShortcut";
import { getRecipeRepository } from "@/shared/data/catalog";
import {
  isListable,
  selectHomeContent,
  toSummary,
  type HomeContent,
  type RecipeSummary,
} from "@/shared/domain/discovery";
import { buttonClasses } from "@/shared/ui/Button";
import { EmptyState, ErrorState } from "@/shared/ui/States";

type Catalog = { ok: true; home: HomeContent; summaries: RecipeSummary[] } | { ok: false };

async function loadCatalog(): Promise<Catalog> {
  try {
    const recipes = await getRecipeRepository().list();
    return {
      ok: true,
      home: selectHomeContent(recipes),
      summaries: recipes.filter(isListable).map(toSummary),
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Home answers one question: "What would I like to cook?"
 * Order on phones: resume (if any) → featured → categories →
 * recently viewed → more recipes → saved. Search sits above all.
 */
export default async function HomePage() {
  const catalog = await loadCatalog();
  const summaries = catalog.ok ? catalog.summaries : [];

  return (
    <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <HomeGreeting />
          <h1 className="text-[30px] font-semibold leading-9 text-ink-900 sm:text-[36px] sm:leading-[44px]">
            What would you like to cook?
          </h1>
        </div>
        <div className="max-w-2xl">
          <RecipeSearchForm />
        </div>
      </header>

      <ContinueCooking catalog={summaries} />

      {!catalog.ok ? (
        <ErrorState
          title="Recipes couldn't load"
          message="Something went wrong reading the recipe catalog. Refresh to try again — search and categories still work."
        />
      ) : catalog.home.featured ? (
        <FeaturedMeal recipe={catalog.home.featured} />
      ) : (
        <EmptyState
          title="No recipes yet"
          message="Chef-validated recipes are being prepared. Check back soon."
          action={
            <Link
              href="/recipes"
              className={buttonClasses({ variant: "secondary", className: "mt-3" })}
            >
              Go to Explore
            </Link>
          }
        />
      )}

      <CategoryGrid />

      <RecentlyViewed catalog={summaries} />

      {catalog.ok && catalog.home.featured && (
        <RecipeCollection recipes={catalog.home.collection} />
      )}

      <SavedShortcut />
    </div>
  );
}
