import { ArrowUpRight, Clock, ListOrdered, Users } from "lucide-react";
import { AppLink as Link } from "./launch";
import { iconForRecipe } from "@/features/recipes/category-icons";
import type { Recipe } from "@/shared/domain/recipe-schema";
import { formatMinutes } from "@/shared/domain/discovery";
import { recipeHref } from "@/shared/domain/navigation";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { Reveal } from "./motion";
import { Band, Eyebrow, PillCta } from "./ui";

function PreviewCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const facts = [
    { Icon: Clock, text: formatMinutes(recipe.timeMinutes.total) },
    { Icon: Users, text: `Serves ${recipe.baseServings}` },
    { Icon: ListOrdered, text: `${recipe.steps.length} steps` },
  ];
  return (
    <Reveal as="li" delay={index * 80} className="min-w-0">
      <Link
        href={recipeHref(recipe.slug)}
        className="card-edge group flex h-full flex-col rounded-[28px] bg-white p-2 transition-[box-shadow,translate] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_0_1px_var(--color-line-strong),0_24px_48px_-24px_rgb(21_18_15/0.3)] active:scale-[0.99]"
      >
        <div className="relative aspect-[16/11] overflow-hidden rounded-[22px] bg-surface-100">
          <RecipeImage
            image={recipe.image}
            priority={index < 2}
            FallbackIcon={iconForRecipe(recipe.categories)}
            className="h-full w-full rounded-[22px] transition-[scale] duration-700 ease-out group-hover:scale-[1.04]"
          />
          <span
            aria-hidden
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-900 backdrop-blur transition-colors duration-200 group-hover:bg-primary-600 group-hover:text-white"
          >
            <ArrowUpRight size={18} strokeWidth={2} />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-5 sm:px-5">
          <h3 className="font-headline text-[1.5rem] font-medium leading-tight tracking-[-0.02em] text-ink-900 sm:text-[1.75rem]">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="line-clamp-3 text-[0.9375rem] leading-[1.6] text-ink-500">
              {recipe.description}
            </p>
          )}
          <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1.5 pt-2 font-label text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-600">
            {facts.map(({ Icon, text }) =>
              text ? (
                <li key={text} className="inline-flex items-center gap-1.5">
                  <Icon aria-hidden size={14} strokeWidth={2} className="text-primary-700" />
                  {text}
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </Link>
    </Reveal>
  );
}

/** A few recipes to taste the catalog; the rest live in the app. */
export function RecipePreview({ recipes, total }: { recipes: Recipe[]; total: number }) {
  const more = total - recipes.length;
  return (
    <>
      <Band
        id="top"
        rule={false}
        labelledBy="recipes-title"
        innerClassName="pb-14 pt-32 sm:pt-40 lg:pt-44"
      >
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5 text-center [&>.eyebrow]:items-center">
          <Eyebrow>Recipes</Eyebrow>
          <Reveal
            as="h1"
            id="recipes-title"
            delay={80}
            className="heading-rise font-headline text-[2.5rem] font-medium leading-[1.02] tracking-[-0.02em] text-ink-900 sm:text-[3.25rem] lg:text-[4rem]"
          >
            Start with a classic. <span className="text-ink-500">Cook it one step at a time.</span>
          </Reveal>
          <p className="max-w-[560px] text-[1.0625rem] leading-[1.6] text-ink-500 sm:text-[1.125rem]">
            Four Nigerian favourites to get you going. Open one to see what you need, check your
            kitchen, and cook along with timers and read-aloud.
          </p>
        </div>
      </Band>

      <Band label="Featured recipes" innerClassName="py-10 sm:py-14">
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {recipes.map((r, i) => (
            <PreviewCard key={r.id} recipe={r} index={i} />
          ))}
        </ul>
      </Band>

      <Band label="More recipes" innerClassName="py-20 sm:py-28">
        <Reveal className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center">
          <p className="font-headline text-[1.75rem] font-medium leading-tight tracking-[-0.02em] text-ink-900 sm:text-[2.25rem]">
            {more > 0 ? (
              <>
                {more} more in the app.{" "}
                <span className="text-ink-500">
                  Search by dish or by what&apos;s in your kitchen.
                </span>
              </>
            ) : (
              <>
                Plenty more in the app.{" "}
                <span className="text-ink-500">
                  Search by dish or by what&apos;s in your kitchen.
                </span>
              </>
            )}
          </p>
          <PillCta href="/recipes" className="font-label uppercase tracking-[0.06em]">
            See more recipes
          </PillCta>
        </Reveal>
      </Band>
    </>
  );
}
