import type { ReactNode } from "react";
import { iconForRecipe } from "@/features/recipes/category-icons";
import type { RecipeSummary } from "@/shared/domain/discovery";
import { recipeHref } from "@/shared/domain/navigation";
import { RecipeCard } from "./RecipeCard";

export interface HorizontalRecipeListProps {
  /** Recipe summaries to render. */
  recipes?: RecipeSummary[];
  /** Originating internal path for back-link preservation. */
  from?: string;
  /** Set of saved recipe ids. */
  savedIds?: string[];
  /** Callback when save is toggled. */
  onSaveToggle?: (recipeId: string) => void;
  /** Accessible label for the list region. */
  label?: string;
  /** Children override when custom card items are rendered. */
  children?: ReactNode;
  className?: string;
}

/**
 * Horizontal Recipe List (Clean Kitchen system):
 * - Mobile thumb-friendly horizontal scroll row
 * - Bleeds to screen edges on mobile (-mx-5 px-5), aligned on tablet/desktop
 * - Snap-scrolling with no-scrollbar styling
 * - Keeps cards at an optimal reading width (185px on mobile, 220px on tablet/desktop)
 */
export function HorizontalRecipeList({
  recipes,
  from,
  savedIds = [],
  onSaveToggle,
  label = "Recipe collection",
  children,
  className = "",
}: HorizontalRecipeListProps) {
  return (
    <div className={`relative ${className}`} role="region" aria-label={label}>
      <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory sm:mx-0 sm:px-0">
        {recipes
          ? recipes.map((recipe) => (
              <li key={recipe.id} className="w-[185px] shrink-0 snap-start sm:w-[220px]">
                <RecipeCard
                  title={recipe.title}
                  href={from ? recipeHref(recipe.slug, { from }) : undefined}
                  minutes={recipe.totalMinutes}
                  difficulty={recipe.difficulty}
                  categories={recipe.categories}
                  image={recipe.image}
                  demo={recipe.demo}
                  saved={savedIds.includes(recipe.id)}
                  onSaveToggle={onSaveToggle ? () => onSaveToggle(recipe.id) : undefined}
                  recipeId={recipe.id}
                  FallbackIcon={iconForRecipe(recipe.categories)}
                />
              </li>
            ))
          : children}
      </ul>
    </div>
  );
}
