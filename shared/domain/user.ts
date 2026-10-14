import { z } from "zod";

/**
 * Owners. Everything a cook keeps (saved recipes, lists, sessions) is
 * scoped to an owner id: the device's guest owner until they choose to
 * sign in, then their account id (see `shared/domain/auth.ts`).
 */

/**
 * The owner id for data kept on this device before (or without) an account.
 * An authenticated user's id replaces it as the owner once sign-in exists.
 */
export const GUEST_OWNER = "guest";

export const savedRecipeSchema = z.object({
  ownerId: z.string().min(1).max(100),
  recipeId: z.string().min(1).max(100),
  savedAt: z.number().int().nonnegative(),
});

export type SavedRecipe = z.infer<typeof savedRecipeSchema>;
