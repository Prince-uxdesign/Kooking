import { recipeHref, type RecipeSummary } from "@/shared/domain/discovery";
import { RecipeCard } from "@/shared/ui/RecipeCard";
import { iconForRecipe } from "./category-icons";

/**
 * Discovery grid: 2-up on phones, 3-up from 768px. `from` is the page
 * the cards live on, so the recipe page can link straight back to it.
 */
export function RecipeGrid({ recipes, from }: { recipes: RecipeSummary[]; from: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {recipes.map((recipe) => (
        <li key={recipe.id} className="min-w-0">
          <RecipeCard
            title={recipe.title}
            href={recipeHref(recipe.slug, from)}
            minutes={recipe.totalMinutes}
            image={recipe.image}
            demo={recipe.demo}
            FallbackIcon={iconForRecipe(recipe.categories)}
          />
        </li>
      ))}
    </ul>
  );
}
