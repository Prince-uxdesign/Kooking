import { z } from "zod";
import type { CookingSession } from "./session";

/**
 * Cooking History (Phase 35).
 * Represents completed, abandoned, or interrupted cooking sessions.
 * Preserves recipe snapshot information (title, version, servings)
 * so history remains accurate even if a recipe is republished or deleted.
 */

export const COOKING_HISTORY_STATUSES = ["completed", "abandoned", "interrupted"] as const;
export type CookingHistoryStatus = (typeof COOKING_HISTORY_STATUSES)[number];

export const cookingHistoryStatusSchema = z.enum(COOKING_HISTORY_STATUSES);

export const cookingHistoryEntrySchema = z.object({
  id: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(100),
  userId: z.string().min(1).max(100).nullable().optional(),
  recipeId: z.string().min(1).max(100),
  recipeTitle: z.string().min(1).max(200),
  recipeSlug: z.string().min(1).max(120),
  contentVersion: z.number().int().min(1),
  servings: z.number().int().min(1).max(24),
  status: cookingHistoryStatusSchema,
  startedAt: z.number().int().nonnegative(),
  completedAt: z.number().int().nonnegative().nullable(),
  durationMinutes: z.number().int().nonnegative().nullable(),
  completedStepsCount: z.number().int().nonnegative(),
  totalStepsCount: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
});

export type CookingHistoryEntry = z.infer<typeof cookingHistoryEntrySchema>;

/**
 * Derives a history log entry from a CookingSession.
 * - Completed sessions have status "completed".
 * - Explicitly ended sessions have status "abandoned".
 * - Incomplete/unresumed sessions (e.g. superseded by a new cook) have status "interrupted".
 * An interrupted session is never classified as completed merely because the browser was closed.
 */
export function sessionToHistoryEntry(
  session: CookingSession,
  options: {
    statusOverride?: CookingHistoryStatus;
    userId?: string | null;
    now?: number;
  } = {},
): CookingHistoryEntry {
  const now = options.now ?? Date.now();
  let status: CookingHistoryStatus;

  if (options.statusOverride) {
    status = options.statusOverride;
  } else if (session.status === "completed") {
    status = "completed";
  } else if (session.status === "abandoned") {
    status = "abandoned";
  } else {
    // Active or paused session being closed or superseded
    status = "interrupted";
  }

  const completedAt =
    status === "completed"
      ? (session.completedAt ?? now)
      : status === "abandoned"
        ? (session.abandonedAt ?? now)
        : now;

  const durationMinutes =
    completedAt >= session.createdAt
      ? Math.max(1, Math.round((completedAt - session.createdAt) / 60_000))
      : 1;

  const totalSteps = session.steps.length;
  const completedSteps = session.completedStepIds.filter((id) =>
    session.steps.some((s) => s.id === id),
  ).length;

  return cookingHistoryEntrySchema.parse({
    id: `history:${session.id}`,
    sessionId: session.id,
    userId: options.userId ?? null,
    recipeId: session.recipeId,
    recipeTitle: session.recipeTitle ?? session.recipeSlug,
    recipeSlug: session.recipeSlug,
    contentVersion: session.contentVersion,
    servings: session.servings,
    status,
    startedAt: session.createdAt,
    completedAt: status === "interrupted" && !session.completedAt ? null : completedAt,
    durationMinutes: status === "interrupted" && !session.completedAt ? null : durationMinutes,
    completedStepsCount: completedSteps,
    totalStepsCount: totalSteps,
    createdAt: now,
  });
}

/**
 * Merges local and remote cooking history entries.
 * Deduplicates by sessionId. If conflicting statuses exist,
 * completed takes precedence over interrupted/abandoned.
 * Sorted newest startedAt first.
 */
export function mergeCookingHistory(
  local: CookingHistoryEntry[],
  remote: CookingHistoryEntry[],
): CookingHistoryEntry[] {
  const map = new Map<string, CookingHistoryEntry>();

  const process = (entry: CookingHistoryEntry) => {
    const existing = map.get(entry.sessionId);
    if (!existing) {
      map.set(entry.sessionId, entry);
      return;
    }
    // Completed status takes priority
    if (existing.status !== "completed" && entry.status === "completed") {
      map.set(entry.sessionId, entry);
      return;
    }
    // Otherwise pick the one with later completedAt or createdAt
    const existingTime = existing.completedAt ?? existing.createdAt;
    const entryTime = entry.completedAt ?? entry.createdAt;
    if (entryTime > existingTime) {
      map.set(entry.sessionId, entry);
    }
  };

  for (const entry of local) process(entry);
  for (const entry of remote) process(entry);

  return [...map.values()].sort((a, b) => b.startedAt - a.startedAt);
}
