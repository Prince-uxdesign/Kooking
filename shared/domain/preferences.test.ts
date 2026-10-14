import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_PREFERENCES,
  updateUserPreferences,
  userCookingPreferencesSchema,
  type UserCookingPreferences,
} from "./preferences";

describe("preferences domain", () => {
  it("validates default preferences", () => {
    const valid = userCookingPreferencesSchema.safeParse(DEFAULT_USER_PREFERENCES);
    expect(valid.success).toBe(true);
    expect(DEFAULT_USER_PREFERENCES.screenWake).toBe(true);
    expect(DEFAULT_USER_PREFERENCES.soundAlerts).toBe(true);
    expect(DEFAULT_USER_PREFERENCES.readAloud).toBe(false);
    expect(DEFAULT_USER_PREFERENCES.defaultServings).toBeNull();
  });

  it("updates preferences and attaches timestamp", () => {
    const original: UserCookingPreferences = {
      defaultServings: 2,
      screenWake: true,
      soundAlerts: true,
      readAloud: false,
    };

    const updated = updateUserPreferences(
      original,
      { defaultServings: 6, readAloud: true },
      123456,
    );

    expect(updated.defaultServings).toBe(6);
    expect(updated.readAloud).toBe(true);
    expect(updated.screenWake).toBe(true);
    expect(updated.updatedAt).toBe(123456);
  });

  it("rejects invalid serving counts", () => {
    expect(() => updateUserPreferences(DEFAULT_USER_PREFERENCES, { defaultServings: 0 })).toThrow();

    expect(() =>
      updateUserPreferences(DEFAULT_USER_PREFERENCES, { defaultServings: 30 }),
    ).toThrow();
  });

  it("does not store health, allergy or sensitive personal profiles", () => {
    const schemaKeys = Object.keys(userCookingPreferencesSchema.shape);
    expect(schemaKeys).not.toContain("allergies");
    expect(schemaKeys).not.toContain("dietaryRestrictions");
    expect(schemaKeys).not.toContain("healthProfile");
    expect(schemaKeys).not.toContain("medicalConditions");
  });
});
