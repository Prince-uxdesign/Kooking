import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CategoryChips } from "@/features/recipes/CategoryChips";
import { CollectionList } from "@/features/recipes/CollectionList";
import { loadDiscovery, type Discovery } from "@/features/recipes/load-discovery";
import { RecipeGrid } from "@/features/recipes/RecipeGrid";
import { RecipeSearchForm } from "@/features/recipes/RecipeSearchForm";
import { recipeCountLabel } from "@/shared/domain/categories";
import { visibleCollections } from "@/shared/domain/collections";
import { exploreQuery, toSummary } from "@/shared/domain/discovery";
import { buttonClasses } from "@/shared/ui/Button";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { EmptyState, ErrorState } from "@/shared/ui/States";

export const metadata: Metadata = { title: "Explore" };

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

/**
 * Explore: for people who know the dish (search) and people who want
 * ideas (categories, collections, everything). Search results arrive
 * in Phase 9; until then a query is acknowledged, not faked.
 */
export default async function ExplorePage({ searchParams }: Props) {
  const params = await searchParams;

  const query = exploreQuery(params.q);
  const discovery = await loadDiscovery();

  return (
    <div className="flex flex-col gap-8 sm:gap-10 lg:gap-12">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-semibold leading-9 text-ink-900 sm:text-[36px] sm:leading-[44px]">
            Explore
          </h1>
          <p className="max-w-prose text-[16px] leading-6 text-ink-500">
            Find Nigerian dishes by category, by the time you have, or just by browsing. No need to
            know the name.
          </p>
        </div>
        <div className="max-w-2xl">
          <RecipeSearchForm defaultQuery={query ?? ""} />
        </div>
        {query && (
          <div
            role="status"
            className="flex items-center gap-3.5 rounded-3xl bg-surface-100 p-2 pr-4 sm:pr-2"
          >
            <span
              aria-hidden
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink-900"
            >
              <Search size={20} strokeWidth={1.75} />
            </span>
            <p className="min-w-0 flex-1 text-[15px] leading-6 text-ink-500">
              <span className="text-ink-900">Search for “{query}” is coming soon.</span> Until then,
              browse by category or collection below.
            </p>
            <Link
              href="/recipes"
              className={buttonClasses({ variant: "light", className: "hidden sm:inline-flex" })}
            >
              Clear
            </Link>
          </div>
        )}
      </header>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <SectionHeading id="categories-heading" title="Categories" />
        <CategoryChips />
      </section>

      {!discovery.ok ? (
        <ErrorState
          title="Recipes couldn't load"
          message="Something went wrong reading the recipe catalog. Refresh to try again — categories still work."
        />
      ) : (
        <>
          <ExploreCollections discovery={discovery} />
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
        </>
      )}
    </div>
  );
}

function ExploreCollections({ discovery }: { discovery: Extract<Discovery, { ok: true }> }) {
  const overviews = visibleCollections(discovery.collections, discovery.recipes, toSummary);
  return (
    <section aria-labelledby="collections-heading" className="flex flex-col gap-4">
      <SectionHeading id="collections-heading" title="Collections" />
      {overviews.length === 0 ? (
        <p className="rounded-3xl bg-surface-100 px-5 py-5 text-[15px] leading-6 text-ink-500">
          Collections such as Quick meals and One-pot meals appear here once recipes match them.
        </p>
      ) : (
        <div className="lg:max-w-3xl">
          <CollectionList overviews={overviews} />
        </div>
      )}
    </section>
  );
}
