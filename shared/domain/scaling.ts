import type { Recipe, RecipeIngredient } from "./recipe-schema";
import { formatQuantity, scaleAmount } from "./units";

export interface ScaledLine extends RecipeIngredient {
  scaledQuantity: number | null;
  displayQuantity: string;
  approximate: boolean;
  requiresManual: boolean;
}

export function clampServings(value: number, min = 1, max = 12): number {
  if (!Number.isFinite(value) || value < min) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Scale every line of a recipe. Timers, heat, and instructions are untouched. */
export function scaleRecipe(
  recipe: Recipe,
  targetServings: number,
  maxLimit?: number,
): ScaledLine[] {
  const effectiveMax = maxLimit ?? Math.max(12, recipe.baseServings);
  const servings = clampServings(targetServings, 1, effectiveMax);
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

/** Calculate the scaling ratio between base and target servings. */
export function calculateScalingRatio(baseServings: number, targetServings: number): number {
  if (!Number.isFinite(baseServings) || baseServings <= 0) return 1;
  const clamped = clampServings(targetServings, 1, Math.max(24, baseServings));
  return Math.round((clamped / baseServings) * 1000) / 1000;
}

/** Check if recipe servings are currently modified from the base yield. */
export function isRecipeScaled(baseServings: number, currentServings: number): boolean {
  return clampServings(baseServings, 1, 24) !== clampServings(currentServings, 1, 24);
}

/** Quantities relevant to one step — the contextual slice Cooking Mode shows. */
export function contextualQuantities(
  scaledLines: ScaledLine[],
  stepIngredientIds: string[],
): ScaledLine[] {
  const wanted = new Set(stepIngredientIds);
  return scaledLines.filter((line) => wanted.has(line.id));
}
