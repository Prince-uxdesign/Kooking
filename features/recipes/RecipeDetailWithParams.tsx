"use client";

import { useSearchParams } from "next/navigation";
import { resolveServings } from "@/shared/domain/kitchen-check";
import {
  RecipeDetailInteractive,
  type RecipeDetailInteractiveProps,
} from "./RecipeDetailInteractive";

/**
 * Reads `?servings=` and `?from=` so a cook coming back from Kitchen
 * Check lands on the serving count they left with. Wrap in <Suspense>
 * with the plain interactive view as fallback to keep the page static.
 */
export function RecipeDetailWithParams(props: RecipeDetailInteractiveProps) {
  const params = useSearchParams();
  const raw = params.get("servings");
  const initialServings = raw === null ? undefined : resolveServings(raw, props.recipe).servings;
  return (
    <RecipeDetailInteractive
      {...props}
      initialServings={initialServings}
      from={params.get("from")}
    />
  );
}
