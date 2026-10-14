import type { Recipe, RecipeIngredient } from "./recipe-schema";
import { formatQuantity, scaleAmount } from "./units";

export interface ScaledLine extends RecipeIngredient {
  scaledQuantity: number | null;
  displayQuantity: string;
  approximate: boolean;
  requiresManual: boolean;
}

export function clampServings(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(12, Math.max(1, Math.round(value)));
}

/** Scale every line of a recipe. Timers and instructions are untouched. */
export function scaleRecipe(recipe: Recipe, targetServings: number): ScaledLine[] {
  const servings = clampServings(targetServings);
  return recipe.ingredients.map((line) => {
    const scaled = scaleAmount(
      line.quantity,
      recipe.baseServings,
      servings,
      line.scaling,
      line.unit,
    );
    return {
      ...line,
      scaledQuantity: scaled.amount,
      displayQuantity: formatQuantity(scaled.amount, line.unit),
      approximate: scaled.approximate,
      requiresManual: scaled.requiresManual,
    };
  });
}

/** Quantities relevant to one step — the contextual slice Cooking Mode shows. */
export function contextualQuantities(
  scaledLines: ScaledLine[],
  stepIngredientIds: string[],
): ScaledLine[] {
  const wanted = new Set(stepIngredientIds);
  return scaledLines.filter((line) => wanted.has(line.id));
}
