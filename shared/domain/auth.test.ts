import { describe, expect, it } from "vitest";
import {
  formatAuthError,
  isSessionExpired,
  planSavedRecipesMerge,
  validateEmail,
  validatePassword,
  type AuthSession,
} from "./auth";

describe("auth input validation", () => {
  it("validates email addresses", () => {
    expect(validateEmail("").valid).toBe(false);
    expect(validateEmail("  ").valid).toBe(false);
    expect(validateEmail("not-an-email").valid).toBe(false);
    expect(validateEmail("user@domain").valid).toBe(false);
    expect(validateEmail("user@example.com").valid).toBe(true);
    expect(validateEmail("  cook@nigeria.ng  ").valid).toBe(true);
  });

  it("validates password minimum length", () => {
    expect(validatePassword("").valid).toBe(false);
    expect(validatePassword("short").valid).toBe(false);
    expect(validatePassword("1234567").valid).toBe(false);
    expect(validatePassword("12345678").valid).toBe(true);
    expect(validatePassword("correct horse battery staple").valid).toBe(true);
  });
});

describe("error formatting", () => {
  it("translates common Supabase / auth error strings to friendly text", () => {
    expect(formatAuthError({ message: "Invalid login credentials" })).toContain(
      "Incorrect email or password",
    );
    expect(formatAuthError({ message: "User already registered" })).toContain("already exists");
    expect(formatAuthError({ message: "Password should be at least 8 characters" })).toContain(
      "at least 8 characters",
    );
    expect(formatAuthError({ message: "Email not confirmed" })).toContain("confirm your email");
    expect(formatAuthError({ message: "Failed to fetch" })).toContain(
      "check your internet connection",
    );
  });

  it("handles empty or generic errors gracefully", () => {
    expect(formatAuthError(null)).toBe("An unexpected error occurred. Please try again.");
    expect(formatAuthError(undefined)).toBe("An unexpected error occurred. Please try again.");
  });
});

describe("planSavedRecipesMerge", () => {
  it("merges disjoint guest and account saved recipes without loss", () => {
    const guest = ["jollof-rice", "egusi-soup"];
    const account = ["fried-plantain", "moi-moi"];
    const plan = planSavedRecipesMerge(guest, account);

    expect(plan.toUpload).toEqual(["jollof-rice", "egusi-soup"]);
    expect(plan.mergedIds).toEqual(["fried-plantain", "moi-moi", "jollof-rice", "egusi-soup"]);
    expect(plan.duplicateCount).toBe(0);
  });

  it("deduplicates recipes present in both guest and account storage", () => {
    const guest = ["jollof-rice", "fried-plantain", "pepper-soup"];
    const account = ["jollof-rice", "fried-rice"];
    const plan = planSavedRecipesMerge(guest, account);

    expect(plan.toUpload).toEqual(["fried-plantain", "pepper-soup"]);
    expect(plan.duplicateCount).toBe(1);
    expect(plan.mergedIds).toEqual(["jollof-rice", "fried-rice", "fried-plantain", "pepper-soup"]);
  });

  it("handles empty guest or account sets", () => {
    const emptyGuest = planSavedRecipesMerge([], ["jollof"]);
    expect(emptyGuest.toUpload).toEqual([]);
    expect(emptyGuest.mergedIds).toEqual(["jollof"]);

    const emptyAccount = planSavedRecipesMerge(["jollof"], []);
    expect(emptyAccount.toUpload).toEqual(["jollof"]);
    expect(emptyAccount.mergedIds).toEqual(["jollof"]);
  });
});

describe("isSessionExpired", () => {
  const dummySession: AuthSession = {
    accessToken: "token-123",
    expiresAt: 1_700_000_000_000,
    user: {
      id: "usr-1",
      email: "chef@example.com",
      createdAt: 1_600_000_000_000,
    },
  };

  it("identifies unexpired and expired sessions", () => {
    expect(isSessionExpired(dummySession, 1_699_999_999_999)).toBe(false);
    expect(isSessionExpired(dummySession, 1_700_000_000_000)).toBe(true);
    expect(isSessionExpired(dummySession, 1_700_000_000_001)).toBe(true);
  });
});
