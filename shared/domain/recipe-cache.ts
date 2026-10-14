import { z } from "zod";
import { recipeSchema, type Recipe } from "./recipe-schema";

/**
 * Domain model for locally cached recipes (Phase 36).
 * Preserves structured steps, ingredient quantities, sensory cues,
 * equipment, and timers so cooking sessions can start and continue offline.
 */

export const cachedRecipeEntrySchema = z.object({
  recipe: recipeSchema,
  cachedAt: z.number().int().positive(),
  version: z.number().int().default(1),
});

export type CachedRecipeEntry = z.infer<typeof cachedRecipeEntrySchema>;

/**
 * Format relative or localized cache age for user transparency.
 */
export function formatCachedAt(cachedAt: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - cachedAt);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
