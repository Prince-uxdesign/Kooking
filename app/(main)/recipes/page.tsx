import type { Metadata } from "next";
import { CategoryChips } from "@/features/recipes/CategoryChips";
import { CollectionList } from "@/features/recipes/CollectionList";
import { ExploreSearch } from "@/features/recipes/ExploreSearch";
import { loadDiscovery, type Discovery } from "@/features/recipes/load-discovery";
import { RecipeGrid } from "@/features/recipes/RecipeGrid";
import { recipeCountLabel } from "@/shared/domain/categories";
import { visibleCollections } from "@/shared/domain/collections";
import { toSummary } from "@/shared/domain/discovery";
import { buildSearchIndex } from "@/shared/domain/search";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { EmptyState, ErrorState } from "@/shared/ui/States";

export const metadata: Metadata = { title: "Explore" };

/**
 * Rendered per request so a shared or reloaded search URL arrives with
 * its results already in the HTML (no flash of the browse view).
 */
export const dynamic = "force-dynamic";

/**
 * Explore: search and filters for people who know what they want;
 * categories, collections, and everything else for people who don't.
 * The search index is built here once and searched on the device.
 */
export default async function ExplorePage() {
  const discovery = await loadDiscovery();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.875rem] font-semibold leading-9 text-ink-900 sm:text-[2.25rem] sm:leading-[44px]">
          Explore
        </h1>
        <p className="max-w-prose text-[1rem] leading-6 text-ink-500">
          Search by dish or ingredient, or browse Nigerian dishes by category and the time you have.
        </p>
      </header>

      {!discovery.ok ? (
        <ErrorState
          title="Recipes couldn't load"
          message="Something went wrong reading the recipe catalog. Refresh to try again."
        />
      ) : (
        <ExploreSearch index={buildSearchIndex(discovery.recipes, discovery.ingredients)}>
          <Browse discovery={discovery} />
        </ExploreSearch>
      )}
    </div>
  );
}

/** The no-search view: categories, collections, all recipes. */
function Browse({ discovery }: { discovery: Extract<Discovery, { ok: true }> }) {
  const overviews = visibleCollections(discovery.collections, discovery.recipes, toSummary);
  return (
    <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <SectionHeading id="categories-heading" title="Categories" />
        <CategoryChips />
      </section>

      <section aria-labelledby="collections-heading" className="flex flex-col gap-4">
        <SectionHeading id="collections-heading" title="Collections" />
        {overviews.length === 0 ? (
          <p className="rounded-3xl bg-surface-100 px-5 py-5 text-[0.9375rem] leading-6 text-ink-500">
            Collections such as Quick meals and One-pot meals appear here once recipes match them.
          </p>
        ) : (
          <div className="lg:max-w-3xl">
            <CollectionList overviews={overviews} />
          </div>
        )}
      </section>

      <section aria-labelledby="all-heading" className="flex flex-col gap-4">
        <SectionHeading
          id="all-heading"
          title="All recipes"
          description={recipeCountLabel(discovery.recipes.length)}
        />
        {discovery.recipes.length === 0 ? (
          <EmptyState
            title="No recipes yet"
            message="Chef-validated recipes are being prepared. Check back soon."
          />
        ) : (
          <RecipeGrid recipes={discovery.recipes.map(toSummary)} from="/recipes" />
        )}
      </section>
    </div>
  );
}
