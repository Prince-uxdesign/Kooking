import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { iconForCollection } from "@/features/recipes/category-icons";
import { ChipRow } from "@/features/recipes/ChipRow";
import { DiscoveryHeader } from "@/features/recipes/DiscoveryHeader";
import { loadDiscovery } from "@/features/recipes/load-discovery";
import { RecipeGrid } from "@/features/recipes/RecipeGrid";
import { getCollectionRepository } from "@/shared/data/catalog";
import { recipeCountLabel } from "@/shared/domain/categories";
import {
  collectionHref,
  recipesInCollection,
  visibleCollections,
} from "@/shared/domain/collections";
import { toSummary } from "@/shared/domain/discovery";
import { buttonClasses } from "@/shared/ui/Button";
import { Chip } from "@/shared/ui/Chip";
import { EmptyState, ErrorState } from "@/shared/ui/States";

type Params = { params: Promise<{ collection: string }> };

/** Collections come from content at build time: unknown slugs 404. */
export const dynamicParams = false;

export async function generateStaticParams() {
  const collections = await getCollectionRepository().list();
  return collections.map(({ slug }) => ({ collection: slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { collection: slug } = await params;
  const collections = await getCollectionRepository().list();
  return { title: collections.find((c) => c.slug === slug)?.title ?? "Not found" };
}

/**
 * One collection's recipes, derived from its rule. Reachable by URL
 * even when empty (with an honest empty state); Explore only links
 * to collections that have recipes.
 */
export default async function CollectionPage({ params }: Params) {
  const { collection: slug } = await params;
  const discovery = await loadDiscovery();
  if (!discovery.ok) {
    return (
      <ErrorState
        title="Recipes couldn't load"
        message="Something went wrong reading the recipe catalog. Refresh to try again."
      />
    );
  }

  const collection = discovery.collections.find((c) => c.slug === slug);
  if (!collection) notFound();

  const recipes = recipesInCollection(discovery.recipes, collection);
  const others = visibleCollections(discovery.collections, discovery.recipes, toSummary).filter(
    (o) => o.collection.slug !== slug,
  );

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <DiscoveryHeader
        title={collection.title}
        description={collection.description}
        meta={recipeCountLabel(recipes.length)}
        Icon={iconForCollection(collection.rule)}
      />
      {others.length > 0 && (
        <ChipRow label="Other collections">
          <li className="shrink-0">
            <Chip href={collectionHref(collection.slug)} selected>
              {collection.title}
            </Chip>
          </li>
          {others.map(({ collection: other }) => (
            <li key={other.slug} className="shrink-0">
              <Chip href={collectionHref(other.slug)}>{other.title}</Chip>
            </li>
          ))}
        </ChipRow>
      )}
      {recipes.length === 0 ? (
        <EmptyState
          title="Nothing in this collection yet"
          message="Recipes join automatically once their details match. Browse everything in the meantime."
          action={
            <Link
              href="/recipes"
              className={buttonClasses({ variant: "secondary", className: "mt-3" })}
            >
              Browse all recipes
            </Link>
          }
        />
      ) : (
        <RecipeGrid recipes={recipes.map(toSummary)} from={collectionHref(collection.slug)} />
      )}
    </div>
  );
}
