import { z } from "zod";

/**
 * Authentication domain models and validation for Fork (Phase 34).
 *
 * Core principles:
 * - Authentication is strictly OPTIONAL. Unauthenticated users are first-class
 *   guests who can browse, search, test readiness, shop, and cook.
 * - Accounts exist to provide cross-device synchronization and backup.
 * - No registration walls or interruptions during cooking.
 */

export const authStatusSchema = z.enum([
  "anonymous",
  "restoring",
  "signing_in",
  "authenticated",
  "signing_out",
  "expired",
  "error",
]);

export type AuthStatus = z.infer<typeof authStatusSchema>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional(),
  createdAt: z.number().int().nonnegative(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.number().int().nonnegative(),
  user: authUserSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;

/* ------------------------------------------------------------------ */
/* Input validation                                                   */
/* ------------------------------------------------------------------ */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, error: "Please enter your email address." };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: "Please enter a valid email address." };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: "Please enter a password." };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }
  return { valid: true };
}

/* ------------------------------------------------------------------ */
/* Error formatting (user-friendly, non-technical)                     */
/* ------------------------------------------------------------------ */

export function formatAuthError(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";
  if (typeof error === "string") return error;

  const errObj = error as { message?: string; status?: number; code?: string };
  const message = errObj.message ?? "";

  // Common Supabase/GoTrue error mappings
  if (/invalid login credentials/i.test(message) || /invalid_credentials/i.test(message)) {
    return "Incorrect email or password. Please verify your details.";
  }
  if (/user already registered/i.test(message) || /email_exists/i.test(message)) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (/password should be at least/i.test(message)) {
    return "Password must be at least 8 characters long.";
  }
  if (/rate limit/i.test(message) || /too many requests/i.test(message)) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email address via the link we sent before signing in.";
  }
  if (/network/i.test(message) || /failed to fetch/i.test(message)) {
    return "Unable to connect. Please check your internet connection and try again.";
  }

  return message.length > 0 && message.length < 150
    ? message
    : "Authentication could not be completed. Please try again.";
}

/* ------------------------------------------------------------------ */
/* Account transition & merge planning (Phase 34 seam for Phase 35)   */
/* ------------------------------------------------------------------ */

export interface SavedRecipesMergePlan {
  /** Recipe IDs unique to the local guest device that should be uploaded to the account. */
  toUpload: string[];
  /** Full unified set of recipe IDs resulting from merging guest + account saves. */
  mergedIds: string[];
  /** Count of recipes already saved on both sides (no duplication). */
  duplicateCount: number;
}

/**
 * Pure calculation of how local guest saves and remote account saves merge
 * without losing any saved recipes or creating duplicates.
 */
export function planSavedRecipesMerge(
  guestRecipeIds: string[],
  accountRecipeIds: string[],
): SavedRecipesMergePlan {
  const accountSet = new Set(accountRecipeIds);
  const toUpload: string[] = [];
  let duplicateCount = 0;

  for (const id of guestRecipeIds) {
    if (accountSet.has(id)) {
      duplicateCount++;
    } else {
      toUpload.push(id);
    }
  }

  // Preserve ordering: account saves first (or newest), followed by uploaded guest saves
  const mergedIds = [...accountRecipeIds, ...toUpload];

  return {
    toUpload,
    mergedIds,
    duplicateCount,
  };
}

/**
 * Checks whether an active session has expired based on current epoch ms.
 */
export function isSessionExpired(session: AuthSession, now: number): boolean {
  return session.expiresAt <= now;
}
