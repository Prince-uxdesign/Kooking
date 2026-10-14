import { Clock, Users } from "lucide-react";
import Link from "next/link";
import { formatMinutes, recipeHref, type RecipeSummary } from "@/shared/domain/discovery";
import { buttonClasses } from "@/shared/ui/Button";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { iconForRecipe } from "@/features/recipes/category-icons";

/**
 * The one featured recipe: photo panel sitting inside a dark frame,
 * copy and a white pill CTA on the dark band. Facts only — time and
 * servings from the recipe. No ratings, popularity, or "chef-tested".
 */
export function FeaturedMeal({ recipe }: { recipe: RecipeSummary }) {
  const href = recipeHref(recipe.slug, "/");
  const time = formatMinutes(recipe.totalMinutes);

  return (
    <section aria-labelledby="featured-heading">
      <h2 id="featured-heading" className="sr-only">
        Featured recipe
      </h2>
      <article className="overflow-hidden rounded-[32px] bg-ink-900 p-1.5 text-white sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Link href={href} tabIndex={-1} aria-hidden className="block">
          <RecipeImage
            image={recipe.image}
            priority
            FallbackIcon={iconForRecipe(recipe.categories)}
            className="aspect-[4/3] w-full rounded-[27px] sm:aspect-auto sm:h-full sm:min-h-[300px]"
          />
        </Link>
        <div className="flex flex-col gap-3 px-4 pb-4 pt-5 sm:justify-center sm:gap-4 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-500 px-3 py-1 text-xs font-medium text-ink-900">
              Featured recipe
            </span>
            {recipe.demo && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">Demo</span>
            )}
          </div>
          <h3 className="line-clamp-3 text-[24px] font-semibold leading-8 sm:text-[28px] sm:leading-9">
            {recipe.title}
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-white/70">
            {time && (
              <li className="tnum inline-flex items-center gap-1.5">
                <Clock aria-hidden size={16} strokeWidth={1.75} />
                <span>
                  <span className="sr-only">Total time: </span>
                  {time}
                </span>
              </li>
            )}
            <li className="tnum inline-flex items-center gap-1.5">
              <Users aria-hidden size={16} strokeWidth={1.75} />
              Serves {recipe.servings}
            </li>
          </ul>
          {recipe.demo && (
            <p className="text-[13px] leading-5 text-white/55">
              Sample recipe for development. Not chef-tested.
            </p>
          )}
          <Link
            href={href}
            className={buttonClasses({
              variant: "light",
              className: "mt-2 w-full sm:w-auto sm:self-start",
            })}
          >
            View recipe
          </Link>
        </div>
      </article>
    </section>
  );
}
