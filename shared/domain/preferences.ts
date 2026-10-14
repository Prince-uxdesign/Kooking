import { z } from "zod";

/**
 * User Cooking Preferences (Phase 35).
 * Only stores functional settings that the application consistently honors:
 * - defaultServings: Preferred serving count when opening recipes/Kitchen Check.
 * - screenWake: Request screen wake lock during cooking mode.
 * - soundAlerts: Play audio chime on timer expiry.
 * - readAloud: Automatically read new cooking steps aloud.
 *
 * Explicitly avoids storing dietary, allergy, or sensitive personal profiles.
 */

export const userCookingPreferencesSchema = z.object({
  defaultServings: z.number().int().min(1).max(24).nullable().default(null),
  screenWake: z.boolean().default(true),
  soundAlerts: z.boolean().default(true),
  readAloud: z.boolean().default(false),
  updatedAt: z.number().int().nonnegative().optional(),
});

export type UserCookingPreferences = z.infer<typeof userCookingPreferencesSchema>;

export const DEFAULT_USER_PREFERENCES: UserCookingPreferences = {
  defaultServings: null,
  screenWake: true,
  soundAlerts: true,
  readAloud: false,
};

/**
 * Validates and merges preference changes, updating the timestamp.
 */
export function updateUserPreferences(
  current: UserCookingPreferences,
  changes: Partial<UserCookingPreferences>,
  now: number = Date.now(),
): UserCookingPreferences {
  const merged = {
    ...current,
    ...changes,
    updatedAt: now,
  };
  return userCookingPreferencesSchema.parse(merged);
}
