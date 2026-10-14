import { z } from "zod";

/**
 * Users are guests first and only in MVP. No passwords, no OAuth,
 * no remote profiles — a stable device id owns saves, lists,
 * and sessions until optional accounts arrive.
 */

export const guestUserSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.literal("guest"),
  createdAt: z.number().int().nonnegative(),
});

export type GuestUser = z.infer<typeof guestUserSchema>;

export function createGuest(id: string, now: number): GuestUser {
  return guestUserSchema.parse({ id, kind: "guest", createdAt: now });
}

export const savedRecipeSchema = z.object({
  ownerId: z.string().min(1).max(100),
  recipeId: z.string().min(1).max(100),
  savedAt: z.number().int().nonnegative(),
});

export type SavedRecipe = z.infer<typeof savedRecipeSchema>;

/** Toggle-save over an id set. Pure; storage lives in shared/data. */
export function toggleSavedId(savedIds: string[], recipeId: string): string[] {
  return savedIds.includes(recipeId)
    ? savedIds.filter((id) => id !== recipeId)
    : [...savedIds, recipeId];
}
