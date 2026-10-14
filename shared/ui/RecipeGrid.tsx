import type { ReactNode } from "react";
import { iconForRecipe } from "@/features/recipes/category-icons";
import { recipeHref, type RecipeSummary } from "@/shared/domain/discovery";
import { RecipeCard } from "./RecipeCard";

export interface RecipeGridProps {
  /** Recipe summaries to render. */
  recipes?: RecipeSummary[];
  /** Originating internal path for back-link preservation. */
  from?: string;
  /** Optional matching reason or note keyed by recipe id. */
  reasons?: Record<string, string | undefined>;
  /** Set of recipe ids currently saved by the user. */
  savedIds?: string[];
  /** Callback when save is toggled for a recipe id. */
  onSaveToggle?: (recipeId: string) => void;
  /** Children override when custom card items are rendered. */
  children?: ReactNode;
  className?: string;
}

/**
 * Responsive Recipe Grid (Clean Kitchen system):
 * - 2-up on mobile phones (`grid-cols-2 gap-3`)
 * - 3-up on tablets and desktops (`sm:gap-4 md:grid-cols-3`)
 * - 4-up on extra large viewports (`xl:grid-cols-4`)
 * - `min-w-0` on columns to prevent long recipe titles from causing overflow
 * - Preserves consistent image aspect ratios across all screen sizes
 */
export function RecipeGrid({
  recipes,
  from,
  reasons = {},
  savedIds = [],
  onSaveToggle,
  children,
  className = "",
}: RecipeGridProps) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 ${className}`}>
      {recipes
        ? recipes.map((recipe) => (
            <li key={recipe.id} className="min-w-0">
              <RecipeCard
                title={recipe.title}
                href={from ? recipeHref(recipe.slug, from) : undefined}
                minutes={recipe.totalMinutes}
                difficulty={recipe.difficulty}
                categories={recipe.categories}
                image={recipe.image}
                demo={recipe.demo}
                meta={reasons[recipe.id]}
                saved={savedIds.includes(recipe.id)}
                onSaveToggle={onSaveToggle ? () => onSaveToggle(recipe.id) : undefined}
                FallbackIcon={iconForRecipe(recipe.categories)}
              />
            </li>
          ))
        : children}
    </ul>
  );
}
