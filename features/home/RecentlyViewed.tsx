"use client";

import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { LocalHistory } from "@/shared/data/local";
import { formatMinutes, type RecipeSummary } from "@/shared/domain/discovery";
import { recipeHref } from "@/shared/domain/navigation";
import { resolveRecentlyViewed } from "@/shared/domain/history";
import { ListGroup, ListRow } from "@/shared/ui/ListGroup";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { iconForRecipe } from "@/features/recipes/category-icons";

const history = new LocalHistory();

type State = { status: "loading" } | { status: "ready"; recipes: RecipeSummary[] };

/**
 * Recipes opened on this device, newest first. History is local-only
 * (no account needed); ids no longer in the catalog are skipped.
 */
export function RecentlyViewed({ catalog }: { catalog: RecipeSummary[] }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let live = true;
    history
      .list()
      .then((views) => resolveRecentlyViewed(views, catalog))
      .catch(() => [])
      .then((recipes) => live && setState({ status: "ready", recipes }));
    return () => {
      live = false;
    };
  }, [catalog]);

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
      <SectionHeading id="recent-heading" title="Recently viewed" />
      {state.status === "loading" ? (
        <div
          role="status"
          aria-label="Loading recently viewed"
          className="h-[88px] animate-pulse rounded-3xl bg-surface-100"
        />
      ) : state.recipes.length === 0 ? (
        <p className="flex items-center gap-3.5 rounded-3xl bg-surface-100 p-2 pr-4 text-[0.9375rem] leading-6 text-ink-500">
          <span
            aria-hidden
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink-900"
          >
            <History size={20} strokeWidth={1.75} />
          </span>
          Recipes you open will appear here, saved on this device.
        </p>
      ) : (
        <ListGroup label="Recently viewed recipes">
          {state.recipes.map((recipe) => (
            <ListRow
              key={recipe.id}
              href={recipeHref(recipe.slug, { from: "/" })}
              title={recipe.title}
              meta={formatMinutes(recipe.totalMinutes) || undefined}
              leading={
                <RecipeImage
                  image={recipe.image}
                  compact
                  FallbackIcon={iconForRecipe(recipe.categories)}
                  className="h-14 w-14 shrink-0 rounded-[18px]"
                />
              }
            />
          ))}
        </ListGroup>
      )}
    </section>
  );
}
