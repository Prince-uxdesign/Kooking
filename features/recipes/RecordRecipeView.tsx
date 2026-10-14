"use client";

import { useEffect } from "react";
import { LocalHistory } from "@/shared/data/local";

const history = new LocalHistory();

/** Adds this recipe to device-local "Recently viewed". Renders nothing. */
export function RecordRecipeView({ recipeId }: { recipeId: string }) {
  useEffect(() => {
    history.record(recipeId, Date.now()).catch(() => {
      // Storage full or blocked — history is a convenience, never a blocker.
    });
  }, [recipeId]);

  return null;
}
