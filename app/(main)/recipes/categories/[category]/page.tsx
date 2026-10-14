import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_ICONS } from "@/features/recipes/category-icons";
import { CategoryChips } from "@/features/recipes/CategoryChips";
import { DiscoveryHeader } from "@/features/recipes/DiscoveryHeader";
import { loadDiscovery } from "@/features/recipes/load-discovery";
import { RecipeGrid } from "@/features/recipes/RecipeGrid";
import {
  CATEGORIES,
  categoryHref,
  getCategory,
  inCategory,
  isRecipeCategory,
  recipeCountLabel,
} from "@/shared/domain/categories";
import { toSummary } from "@/shared/domain/discovery";
import { buttonClasses } from "@/shared/ui/Button";
import { EmptyState, ErrorState } from "@/shared/ui/States";

type Params = { params: Promise<{ category: string }> };

/** Categories are a closed schema enum: anything else is a true 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map(({ id }) => ({ category: id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  return { title: isRecipeCategory(category) ? getCategory(category).label : "Not found" };
}

/**
 * One category's recipes. Membership comes only from each recipe's own
 * `categories` — nothing is placed here to fill the page.
 */
export default async function CategoryPage({ params }: Params) {
  const { category: id } = await params;
  if (!isRecipeCategory(id)) notFound();

  const category = getCategory(id);
  const discovery = await loadDiscovery();
  const recipes = discovery.ok ? discovery.recipes.filter((r) => inCategory(r, id)) : [];

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <DiscoveryHeader
        title={category.label}
        description={category.description}
        meta={discovery.ok ? recipeCountLabel(recipes.length) : ""}
        Icon={CATEGORY_ICONS[id]}
      />
      <CategoryChips current={id} />
      {!discovery.ok ? (
        <ErrorState
          title="Recipes couldn't load"
          message="Something went wrong reading the recipe catalog. Refresh to try again."
        />
      ) : recipes.length === 0 ? (
        <EmptyState
          title={`No ${category.label.toLowerCase()} yet`}
          message="Recipes are added here as they're validated. Try another category, or browse everything."
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
        <RecipeGrid recipes={recipes.map(toSummary)} from={categoryHref(id)} />
      )}
    </div>
  );
}
