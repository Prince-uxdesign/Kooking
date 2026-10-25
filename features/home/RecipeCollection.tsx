import type { RecipeSummary } from "@/shared/domain/discovery";
import { RecipeCollectionSection } from "@/shared/ui/RecipeCollectionSection";
import { SeeAllLink } from "@/shared/ui/SectionHeading";

/**
 * Home Explore collection: uses the reusable RecipeCollectionSection.
 * Labelled "Explore recipes" — Fork has no popularity data, so nothing
 * here claims to be popular or trending.
 */
export function RecipeCollection({ recipes }: { recipes: RecipeSummary[] }) {
  return (
    <RecipeCollectionSection
      id="explore-heading"
      title="Explore recipes"
      action={<SeeAllLink href="/recipes" />}
      recipes={recipes}
      from="/"
      emptyTitle="More recipes on the way"
      emptyMessage="The catalog grows as chef-validated recipes are added. Explore categories in the meantime."
    />
  );
}
