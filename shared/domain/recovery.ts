import { progressSummary } from "./cooking-session";
import type { CookingSession } from "./session";
import { formatRemaining, remainingMs, settleTimers } from "./timers";

/**
 * Session recovery helpers (Phase 28). Pure: they read sessions and
 * describe them; saving stays with the repository and the screens.
 */

/* ------------------------------------------------------------------ */
/* Resume summaries                                                   */
/* ------------------------------------------------------------------ */

export interface TimerGlance {
  id: string;
  label: string;
  state: "running" | "paused" | "done";
  /** "4:12 left", "Paused, 8:30 left", "Time's up". */
  text: string;
}

export interface ResumeSummary {
  sessionId: string;
  recipeId: string;
  title: string;
  servings: number;
  paused: boolean;
  /** "Step 2 of 3", or null for sessions without a step copy. */
  stepLabel: string | null;
  /** The current instruction, from the session's own copy. */
  stepInstruction: string | null;
  timers: TimerGlance[];
  updatedAt: number;
}

/**
 * Everything a "Continue cooking?" prompt needs, computed as of `now`.
 * Timers that ran out while Fork was closed read "Time's up"; they
 * are not restarted and no step is completed.
 */
export function resumeSummary(session: CookingSession, now: number): ResumeSummary {
  const { timers } = settleTimers(session.timers, now);
  const hasSteps = session.steps.length > 0;
  const progress = hasSteps ? progressSummary(session) : null;
  const step = progress ? session.steps[progress.current - 1] : null;
  return {
    sessionId: session.id,
    recipeId: session.recipeId,
    title: session.recipeTitle ?? "Your cooking session",
    servings: session.servings,
    paused: session.status === "paused",
    stepLabel: progress ? `Step ${progress.current} of ${progress.total}` : null,
    stepInstruction: step?.instruction ?? null,
    timers: timers.flatMap((t): TimerGlance[] => {
      const label = t.label ?? "Timer";
      if (t.status === "running") {
        return [
          {
            id: t.id,
            label,
            state: "running",
            text: `${formatRemaining(remainingMs(t, now))} left`,
          },
        ];
      }
      if (t.status === "paused") {
        return [
          {
            id: t.id,
            label,
            state: "paused",
            text: `Paused, ${formatRemaining(remainingMs(t, now))} left`,
          },
        ];
      }
      if (t.status === "done" && !t.acknowledged) {
        return [{ id: t.id, label, state: "done", text: "Time's up" }];
      }
      return [];
    }),
    updatedAt: session.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Salvage from damaged entries                                       */
/* ------------------------------------------------------------------ */

export interface Salvage {
  id: string | null;
  recipeSlug: string | null;
  recipeTitle: string | null;
  servings: number | null;
  /** 1-based, only when it can be trusted. */
  stepNumber: number | null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Pull out whatever is still trustworthy from a damaged session so the
 * cook can pick up where they were (e.g. restart the same recipe at the
 * same servings). Returns null when nothing useful survives.
 */
export function salvageSession(raw: unknown): Salvage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() && v.length <= max ? v : null;
  const slug = str(r.recipeSlug, 120);
  const servings =
    typeof r.servings === "number" &&
    Number.isInteger(r.servings) &&
    r.servings >= 1 &&
    r.servings <= 24
      ? r.servings
      : null;
  const stepCount = Array.isArray(r.steps) ? r.steps.length : null;
  const index =
    typeof r.currentStepIndex === "number" && Number.isInteger(r.currentStepIndex)
      ? r.currentStepIndex
      : null;
  const salvage: Salvage = {
    id: str(r.id, 100),
    recipeSlug: slug && SLUG.test(slug) ? slug : null,
    recipeTitle: str(r.recipeTitle, 200),
    servings,
    stepNumber:
      index !== null && stepCount !== null && index >= 0 && index < stepCount ? index + 1 : null,
  };
  return salvage.recipeSlug || salvage.recipeTitle ? salvage : null;
}

/* ------------------------------------------------------------------ */
/* Concurrent edits (two tabs)                                        */
/* ------------------------------------------------------------------ */

/**
 * Is the stored copy newer than the one on screen? Used before every
 * save so a tab can never overwrite progress made in another tab.
 */
export function isNewerThan(stored: unknown, mine: Pick<CookingSession, "updatedAt">): boolean {
  if (typeof stored !== "object" || stored === null) return false;
  const u = (stored as { updatedAt?: unknown }).updatedAt;
  return typeof u === "number" && u > mine.updatedAt;
}
