import { iconForRecipe } from "@/features/recipes/category-icons";
import type { RecipeSummary } from "@/shared/domain/discovery";
import { recipeHref } from "@/shared/domain/navigation";
import { FeaturedRecipeCard } from "@/shared/ui/FeaturedRecipeCard";

/**
 * Home featured recipe: thin wrapper around the reusable FeaturedRecipeCard.
 * Communicates real recipe facts (time, servings, difficulty) without fabricated badges.
 */
export function FeaturedMeal({
  recipe,
  saved,
  onSaveToggle,
}: {
  recipe: RecipeSummary;
  saved?: boolean;
  onSaveToggle?: () => void;
}) {
  return (
    <section aria-labelledby="featured-heading">
      <h2 id="featured-heading" className="sr-only">
        Featured recipe
      </h2>
      <FeaturedRecipeCard
        title={recipe.title}
        href={recipeHref(recipe.slug, { from: "/" })}
        image={recipe.image}
        minutes={recipe.totalMinutes}
        servings={recipe.servings}
        difficulty={recipe.difficulty}
        categories={recipe.categories}
        demo={recipe.demo}
        saved={saved}
        onSaveToggle={onSaveToggle}
        recipeId={recipe.id}
        FallbackIcon={iconForRecipe(recipe.categories)}
        priority
      />
    </section>
  );
}
