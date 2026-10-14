"use client";

import { useEffect } from "react";
import { LocalHistory, LocalRecipeCache } from "@/shared/data/local";
import type { Recipe } from "@/shared/domain/recipe-schema";

const history = new LocalHistory();
const recipeCache = new LocalRecipeCache();

/** Adds this recipe to device-local "Recently viewed" and local offline cache. Renders nothing. */
export function RecordRecipeView({ recipeId, recipe }: { recipeId: string; recipe?: Recipe }) {
  useEffect(() => {
    history.record(recipeId, Date.now()).catch(() => {
      // Storage full or blocked — history is a convenience, never a blocker.
    });

    if (recipe) {
      recipeCache.save(recipe, Date.now()).catch(() => {
        // Best effort cache
      });
    }
  }, [recipeId, recipe]);

  return null;
}
