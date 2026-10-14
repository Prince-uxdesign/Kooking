import { recipeHref, type RecipeSummary } from "@/shared/domain/discovery";
import { RecipeCard } from "@/shared/ui/RecipeCard";
import { SectionHeading, SeeAllLink } from "@/shared/ui/SectionHeading";
import { iconForRecipe } from "@/features/recipes/category-icons";

/**
 * Compact recipe grid. Labelled "Explore recipes" — Kooking has no
 * popularity data, so nothing here claims to be popular or trending.
 */
export function RecipeCollection({ recipes }: { recipes: RecipeSummary[] }) {
  return (
    <section aria-labelledby="explore-heading" className="flex flex-col gap-4">
      <SectionHeading
        id="explore-heading"
        title="Explore recipes"
        action={<SeeAllLink href="/recipes" />}
      />
      {recipes.length === 0 ? (
        <p className="rounded-3xl bg-surface-100 px-5 py-5 text-[15px] leading-6 text-ink-500">
          More recipes are on the way. The catalog grows as chef-validated recipes are added.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="min-w-0">
              <RecipeCard
                title={recipe.title}
                href={recipeHref(recipe.slug, "/")}
                minutes={recipe.totalMinutes}
                image={recipe.image}
                demo={recipe.demo}
                FallbackIcon={iconForRecipe(recipe.categories)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
