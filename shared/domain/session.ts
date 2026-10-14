import { z } from "zod";
import { recipeStepSchema, type Recipe } from "./recipe-schema";
import { scaleRecipe } from "./scaling";
import {
  MIN_TIMER_SECONDS,
  MAX_TIMER_SECONDS,
  applyTimerAction,
  createTimer,
  sessionTimerSchema,
  settleTimers,
  TimerError,
  type SessionTimer,
  type TimerAction,
} from "./timers";
import { SCALING_BEHAVIORS } from "./units";

/**
 * Cooking sessions (Phase 1 §5). The recipe is immutable input;
 * the session snapshots scaled quantities at start so mid-cook
 * values can never shift — even if the recipe is republished.
 */

export { sessionTimerSchema, type SessionTimer } from "./timers";

export const sessionStatus = ["active", "paused", "completed", "abandoned"] as const;

export const snapshotLineSchema = z.object({
  lineId: z.string().min(1),
  name: z.string().min(1),
  scaledQuantity: z.number().positive().nullable(),
  unit: z.string().nullable(),
  displayQuantity: z.string().min(1),
  /** Fields below were added in Phase 24; absent on older sessions. */
  scaling: z.enum(SCALING_BEHAVIORS).optional(),
  /** The line's quantity at the recipe's base servings (needed to scale per-step amounts). */
  baseQuantity: z.number().positive().nullable().optional(),
  preparation: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  approximate: z.boolean().optional(),
  requiresManual: z.boolean().optional(),
});

export const cookingSessionSchema = z.object({
  id: z.string().min(1).max(100),
  recipeId: z.string().min(1).max(100),
  recipeSlug: z.string().min(1).max(120),
  contentVersion: z.number().int().min(1),
  servings: z.number().int().min(1).max(24),
  currentStepIndex: z.number().int().min(0),
  completedStepIds: z.array(z.string().min(1)).max(60),
  timers: z.array(sessionTimerSchema).max(60),
  snapshot: z.array(snapshotLineSchema).max(60),
  status: z.enum(sessionStatus),
  /** Start time. */
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** Recipe title at start, so the session reads correctly even if the recipe is removed. */
  recipeTitle: z.string().min(1).max(200).optional(),
  /**
   * Instructions as they were when cooking started. The session cooks
   * from this, never from live content, so a republish can't change
   * steps mid-cook. Empty only for sessions saved before Phase 22.
   */
  steps: z.array(recipeStepSchema).max(60).default([]),
  pausedAt: z.number().int().nonnegative().nullable().default(null),
  completedAt: z.number().int().nonnegative().nullable().default(null),
  abandonedAt: z.number().int().nonnegative().nullable().default(null),
  /** Recipe base servings at start, so per-step amounts scale with the same rule. */
  baseServings: z.number().int().min(1).max(24).optional(),
  /** Demo/sample content flag, carried so Cooking Mode never presents it as chef-validated. */
  demo: z.boolean().optional(),
  /** Readiness verdict the session was created under. Only READY can start one. */
  readinessAtStart: z.literal("READY").optional(),
});

export type CookingSession = z.infer<typeof cookingSessionSchema>;

/** Scaled ingredient lines for a session, via the one scaling system. */
function snapshotLines(recipe: Recipe, servings: number, lineNames: Map<string, string>) {
  return scaleRecipe(recipe, servings).map((l) => ({
    lineId: l.id,
    name: lineNames.get(l.id) ?? l.ingredientId,
    scaledQuantity: l.scaledQuantity,
    unit: l.unit,
    displayQuantity: l.displayQuantity,
    scaling: l.scaling,
    baseQuantity: l.quantity,
    preparation: l.preparation,
    note: l.note,
    approximate: l.approximate,
    requiresManual: l.requiresManual,
  }));
}

export function startSession(args: {
  id: string;
  recipe: Pick<Recipe, "id" | "slug" | "contentVersion" | "baseServings" | "ingredients" | "steps">;
  servings: number;
  now: number;
  /** Display names by ingredient line id (catalog lookup, read at start). */
  lineNames: Map<string, string>;
}): CookingSession {
  const full = args.recipe as Recipe;
  const ordered = [...full.steps].sort((x, y) => x.order - y.order);
  const timers: SessionTimer[] = ordered.flatMap((step) =>
    step.timer
      ? [
          createTimer({
            id: `timer:${step.id}`,
            stepId: step.id,
            durationSeconds: step.timer.durationSeconds,
            label: step.timer.label ?? `Step ${step.order} timer`,
          }),
        ]
      : [],
  );

  return cookingSessionSchema.parse({
    id: args.id,
    recipeId: full.id,
    recipeSlug: full.slug,
    contentVersion: full.contentVersion,
    servings: args.servings,
    currentStepIndex: 0,
    completedStepIds: [],
    timers,
    snapshot: snapshotLines(full, args.servings, args.lineNames),
    baseServings: full.baseServings,
    status: "active",
    createdAt: args.now,
    updatedAt: args.now,
    recipeTitle: full.title,
    demo: full.demo,
    steps: [...full.steps].sort((a, b) => a.order - b.order),
    pausedAt: null,
    completedAt: null,
    abandonedAt: null,
  });
}

/**
 * Explicitly updates an active/paused session's servings and snapshots fresh quantities.
 * Must be initiated by user confirmation — never applied silently — and only
 * before any step has been passed. Cooking Mode doesn't offer it: changing
 * servings also changes Kitchen Check readiness, so the supported path is
 * to end the session and start again from Kitchen Check.
 */
export function updateSessionServings(args: {
  session: CookingSession;
  recipe: Recipe;
  servings: number;
  now: number;
  lineNames: Map<string, string>;
}): CookingSession {
  if (args.session.status === "completed" || args.session.status === "abandoned") {
    throw new Error(`cannot update servings on a ${args.session.status} session`);
  }
  // Quantities never change mid-cook: once a step has been passed or
  // marked done, the cook may already have measured something.
  if (args.session.currentStepIndex > 0 || args.session.completedStepIds.length > 0) {
    throw new Error("cannot update servings after cooking has progressed");
  }
  // Rescaling a session for a different recipe version would mix content.
  if (
    args.recipe.id !== args.session.recipeId ||
    args.recipe.contentVersion !== args.session.contentVersion
  ) {
    throw new Error("cannot update servings against a different recipe version");
  }
  return cookingSessionSchema.parse({
    ...args.session,
    servings: args.servings,
    snapshot: snapshotLines(args.recipe, args.servings, args.lineNames),
    baseServings: args.recipe.baseServings,
    updatedAt: args.now,
  });
}

export type Transition = "pause" | "resume" | "complete" | "abandon" | "advance";

/**
 * Permitted transitions. Completed and abandoned are terminal: nothing
 * (including a page refresh or an old link) makes them active again.
 * Steps only move while active, so a paused session can't drift.
 */
export const ALLOWED_TRANSITIONS: Record<CookingSession["status"], readonly Transition[]> = {
  active: ["pause", "complete", "abandon", "advance"],
  paused: ["resume", "complete", "abandon"],
  completed: [],
  abandoned: [],
};

export function canTransition(session: CookingSession, transition: Transition): boolean {
  return ALLOWED_TRANSITIONS[session.status].includes(transition);
}

export class SessionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionTransitionError";
  }
}

function assertCan(session: CookingSession, transition: Transition) {
  if (!canTransition(session, transition)) {
    throw new SessionTransitionError(`cannot ${transition} a ${session.status} session`);
  }
}

/** Number of steps this session cooks from (its own snapshot). */
export function stepCount(session: CookingSession): number {
  return session.steps.length;
}

export function transitionSession(
  session: CookingSession,
  transition: Transition,
  now: number,
): CookingSession {
  assertCan(session, transition);
  switch (transition) {
    case "pause":
      // Timers keep running: food on the stove doesn't pause with the app.
      return { ...session, status: "paused", pausedAt: now, updatedAt: now };
    case "resume":
      return { ...session, status: "active", pausedAt: null, updatedAt: now };
    case "complete":
      return { ...session, status: "completed", pausedAt: null, completedAt: now, updatedAt: now };
    case "abandon":
      return { ...session, status: "abandoned", pausedAt: null, abandonedAt: now, updatedAt: now };
    case "advance": {
      const last = stepCount(session) - 1;
      if (stepCount(session) > 0 && session.currentStepIndex >= last) {
        throw new SessionTransitionError("already on the last step");
      }
      return { ...session, currentStepIndex: session.currentStepIndex + 1, updatedAt: now };
    }
  }
}

/** Move to any step (back or forward). Active sessions only; index must exist. */
export function goToStep(session: CookingSession, index: number, now: number): CookingSession {
  assertCan(session, "advance");
  if (!Number.isInteger(index) || index < 0 || index >= stepCount(session)) {
    throw new SessionTransitionError(`step ${index} does not exist in this session`);
  }
  return { ...session, currentStepIndex: index, updatedAt: now };
}

/**
 * Mark one step done. Only the cook does this — never automatic.
 * Unknown step ids are rejected; repeats are a no-op.
 */
export function completeStep(session: CookingSession, stepId: string, now: number): CookingSession {
  assertCan(session, "advance");
  if (!session.steps.some((s) => s.id === stepId)) {
    throw new SessionTransitionError(`step '${stepId}' is not part of this session`);
  }
  if (session.completedStepIds.includes(stepId)) return session;
  return { ...session, completedStepIds: [...session.completedStepIds, stepId], updatedAt: now };
}

export function uncompleteStep(
  session: CookingSession,
  stepId: string,
  now: number,
): CookingSession {
  assertCan(session, "advance");
  if (!session.completedStepIds.includes(stepId)) return session;
  return {
    ...session,
    completedStepIds: session.completedStepIds.filter((id) => id !== stepId),
    updatedAt: now,
  };
}

/**
 * Apply a timer action inside a session. Timers keep working while the
 * session is paused (the pot doesn't pause), but never on a finished one.
 */
export function applySessionTimer(
  session: CookingSession,
  timerId: string,
  action: TimerAction,
  now: number,
): CookingSession {
  if (session.status === "completed" || session.status === "abandoned") {
    throw new TimerError(`timers can't change on a ${session.status} session`);
  }
  const timer = session.timers.find((t) => t.id === timerId);
  if (!timer) throw new TimerError(`timer '${timerId}' is not part of this session`);
  return {
    ...session,
    updatedAt: now,
    timers: session.timers.map((t) => (t.id === timerId ? applyTimerAction(t, action, now) : t)),
  };
}

/** At most this many cook-added timers can be live (running or paused) at once. */
export const MAX_EXTRA_TIMERS = 6;

/** "10-minute timer", "1 hour 30 minutes timer", "45-second timer". */
export function extraTimerLabel(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600}-hour timer`;
  if (seconds < 3600 && seconds % 60 === 0) return `${seconds / 60}-minute timer`;
  if (seconds < 60) return `${seconds}-second timer`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && `${h} hr`, m && `${m} min`, s && `${s} sec`].filter(Boolean).join(" ") + " timer";
}

/**
 * Start a timer for the current step that the recipe didn't define
 * (Phase 30, "start a ten-minute timer"). Uses the same timer model,
 * persistence and alerts as recipe timers. If the step's own timer is
 * idle and has exactly this duration, that one is started instead of
 * adding a duplicate. Returns the started timer's id.
 */
export function addSessionTimer(
  session: CookingSession,
  durationSeconds: number,
  now: number,
): { session: CookingSession; timerId: string; reused: boolean } {
  if (
    !Number.isInteger(durationSeconds) ||
    durationSeconds < MIN_TIMER_SECONDS ||
    durationSeconds > MAX_TIMER_SECONDS
  ) {
    throw new TimerError(
      `timer duration must be a whole number of seconds from ${MIN_TIMER_SECONDS} to ${MAX_TIMER_SECONDS}`,
    );
  }
  if (session.status === "completed" || session.status === "abandoned") {
    throw new TimerError(`timers can't change on a ${session.status} session`);
  }
  const step = session.steps[session.currentStepIndex];
  if (!step) throw new TimerError("there is no current step");

  const own = session.timers.find(
    (t) => t.stepId === step.id && !t.id.startsWith("extra:") && t.status === "idle",
  );
  if (own && own.durationSeconds === durationSeconds) {
    return {
      session: applySessionTimer(session, own.id, "start", now),
      timerId: own.id,
      reused: true,
    };
  }

  const live = session.timers.filter(
    (t) => t.id.startsWith("extra:") && (t.status === "running" || t.status === "paused"),
  );
  if (live.length >= MAX_EXTRA_TIMERS) {
    throw new TimerError(`no more than ${MAX_EXTRA_TIMERS} extra timers at once`);
  }
  // Make room within the session's timer limit by dropping finished, seen extras.
  let timers = session.timers;
  if (timers.length >= 60) {
    timers = timers.filter(
      (t) => !(t.id.startsWith("extra:") && t.status === "done" && t.acknowledged),
    );
    if (timers.length >= 60) throw new TimerError("this session has too many timers");
  }

  let id = `extra:${now}`;
  for (let n = 2; timers.some((t) => t.id === id); n++) id = `extra:${now}:${n}`;
  const timer = applyTimerAction(
    createTimer({ id, stepId: step.id, durationSeconds, label: extraTimerLabel(durationSeconds) }),
    "start",
    now,
  );
  return {
    session: { ...session, timers: [...timers, timer], updatedAt: now },
    timerId: id,
    reused: false,
  };
}

const isExtraLive = (t: SessionTimer) =>
  t.status === "running" || t.status === "paused" || (t.status === "done" && !t.acknowledged);

/**
 * The timer Cooking Mode shows on a step's card: the recipe's own
 * timer when the step has one, otherwise the newest extra timer that
 * still needs attention. Every other live timer goes in the pinned bar.
 */
export function stepTimerFor(session: CookingSession, stepId: string): SessionTimer | null {
  const own = session.timers.find((t) => t.stepId === stepId && !t.id.startsWith("extra:"));
  if (own) return own;
  const extras = session.timers.filter(
    (t) => t.stepId === stepId && t.id.startsWith("extra:") && isExtraLive(t),
  );
  return extras[extras.length - 1] ?? null;
}

/**
 * Settle timers that ran out at or before `now`. Returns the same
 * session object when nothing changed, so callers can skip a save.
 */
export function settleSessionTimers(
  session: CookingSession,
  now: number,
): { session: CookingSession; finished: string[] } {
  const { timers, finished } = settleTimers(session.timers, now);
  return finished.length ? { session: { ...session, timers }, finished } : { session, finished };
}

/**
 * Reload-safe rehydration. Running timers keep their stored `endsAt`
 * (remaining is always derived from it); any that expired while the
 * page was closed become `done`, stamped with when they ran out.
 */
export function rehydrateSession(raw: unknown, now: number): CookingSession {
  const session = cookingSessionSchema.parse(raw);
  if (session.status === "completed" || session.status === "abandoned") return session;
  return settleSessionTimers(session, now).session;
}

/** Stale recipe content never mutates a live session — cook from snapshot. */
export function sessionFreshness(
  session: CookingSession,
  recipeVersion: number,
): "fresh" | "stale-content" {
  return session.contentVersion === recipeVersion ? "fresh" : "stale-content";
}

/** Only active or paused sessions can be resumed — never completed or abandoned. */
export function isResumable(session: CookingSession): boolean {
  return session.status === "active" || session.status === "paused";
}

/** The most recently touched resumable session, if any. */
export function pickResumable(sessions: CookingSession[]): CookingSession | null {
  return sessions.filter(isResumable).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

/**
 * "Step 3 of 8" for the resume card. Clamps a stale index; null when
 * the recipe's step count is unknown (recipe removed from catalog).
 */
export function resumeProgressLabel(
  session: CookingSession,
  stepCount: number | null,
): string | null {
  if (stepCount === null || stepCount < 1) return null;
  const current = Math.min(Math.max(session.currentStepIndex + 1, 1), stepCount);
  return `Step ${current} of ${stepCount}`;
}
