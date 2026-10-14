import { z } from "zod";
import type { Recipe } from "./recipe-schema";
import { scaleRecipe } from "./scaling";

/**
 * Cooking sessions (Phase 1 §5). The recipe is immutable input;
 * the session snapshots scaled quantities at start so mid-cook
 * values can never shift — even if the recipe is republished.
 */

export const sessionTimerSchema = z.object({
  id: z.string().min(1).max(100),
  stepId: z.string().min(1).max(100),
  durationSeconds: z.number().int().min(5).max(86_400),
  status: z.enum(["idle", "running", "paused", "done"]),
  endsAt: z.number().int().nonnegative().nullable(),
  remainingSeconds: z.number().int().min(0),
});

export type SessionTimer = z.infer<typeof sessionTimerSchema>;

export const sessionStatus = ["active", "paused", "completed", "abandoned"] as const;

export const snapshotLineSchema = z.object({
  lineId: z.string().min(1),
  name: z.string().min(1),
  scaledQuantity: z.number().positive().nullable(),
  unit: z.string().nullable(),
  displayQuantity: z.string().min(1),
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
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type CookingSession = z.infer<typeof cookingSessionSchema>;

export function startSession(args: {
  id: string;
  recipe: Pick<Recipe, "id" | "slug" | "contentVersion" | "baseServings" | "ingredients" | "steps">;
  servings: number;
  now: number;
  /** Display names by ingredient line id (catalog lookup, read at start). */
  lineNames: Map<string, string>;
}): CookingSession {
  const full = args.recipe as Recipe;
  const lines = scaleRecipe(full, args.servings);
  const timers: SessionTimer[] = full.steps.flatMap((step) =>
    step.timer
      ? [
          {
            id: `timer:${step.id}`,
            stepId: step.id,
            durationSeconds: step.timer.durationSeconds,
            status: "idle" as const,
            endsAt: null,
            remainingSeconds: step.timer.durationSeconds,
          },
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
    snapshot: lines.map((l) => ({
      lineId: l.id,
      name: args.lineNames.get(l.id) ?? l.ingredientId,
      scaledQuantity: l.scaledQuantity,
      unit: l.unit,
      displayQuantity: l.displayQuantity,
    })),
    status: "active",
    createdAt: args.now,
    updatedAt: args.now,
  });
}

/** Display names for a snapshot, refreshed from a catalog lookup. */
export function nameSnapshot(session: CookingSession, names: Map<string, string>): CookingSession {
  return {
    ...session,
    snapshot: session.snapshot.map((line) => ({
      ...line,
      name: names.get(line.lineId) ?? line.name,
    })),
  };
}

/**
 * Explicitly updates an active/paused session's servings and snapshots fresh quantities.
 * Must be initiated by user confirmation — never applied silently.
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
  const lines = scaleRecipe(args.recipe, args.servings);
  return cookingSessionSchema.parse({
    ...args.session,
    servings: args.servings,
    snapshot: lines.map((l) => ({
      lineId: l.id,
      name: args.lineNames.get(l.id) ?? l.ingredientId,
      scaledQuantity: l.scaledQuantity,
      unit: l.unit,
      displayQuantity: l.displayQuantity,
    })),
    updatedAt: args.now,
  });
}

type Transition = "pause" | "resume" | "complete" | "abandon" | "advance";

const ALLOWED: Record<CookingSession["status"], Transition[]> = {
  active: ["pause", "complete", "abandon", "advance"],
  paused: ["resume", "complete", "abandon"],
  completed: [],
  abandoned: [],
};

export function transitionSession(
  session: CookingSession,
  transition: Transition,
  now: number,
): CookingSession {
  if (!ALLOWED[session.status].includes(transition)) {
    throw new Error(`cannot ${transition} a ${session.status} session`);
  }
  switch (transition) {
    case "pause":
      return { ...session, status: "paused", updatedAt: now };
    case "resume":
      return { ...session, status: "active", updatedAt: now };
    case "complete":
      return { ...session, status: "completed", updatedAt: now };
    case "abandon":
      return { ...session, status: "abandoned", updatedAt: now };
    case "advance":
      return {
        ...session,
        currentStepIndex: session.currentStepIndex + 1,
        updatedAt: now,
      };
  }
}

export function startTimer(session: CookingSession, timerId: string, now: number): CookingSession {
  return {
    ...session,
    updatedAt: now,
    timers: session.timers.map((t) =>
      t.id === timerId && t.status !== "done"
        ? { ...t, status: "running" as const, endsAt: now + t.remainingSeconds * 1000 }
        : t,
    ),
  };
}

export function pauseTimer(session: CookingSession, timerId: string, now: number): CookingSession {
  return {
    ...session,
    updatedAt: now,
    timers: session.timers.map((t) => {
      if (t.id !== timerId || t.status !== "running") return t;
      const remaining =
        t.endsAt === null ? t.remainingSeconds : Math.max(0, Math.round((t.endsAt - now) / 1000));
      return { ...t, status: "paused" as const, endsAt: null, remainingSeconds: remaining };
    }),
  };
}

/**
 * Reload-safe rehydration: running timers recompute `remaining`
 * from `endsAt`; elapsed timers land on done with 0 remaining.
 */
export function rehydrateSession(raw: unknown, now: number): CookingSession {
  const session = cookingSessionSchema.parse(raw);
  const timers = session.timers.map((t) => {
    if (t.status !== "running") return t;
    if (t.endsAt === null) return { ...t, status: "paused" as const };
    const remaining = Math.max(0, Math.round((t.endsAt - now) / 1000));
    return remaining === 0
      ? { ...t, status: "done" as const, endsAt: null as number | null, remainingSeconds: 0 }
      : { ...t, remainingSeconds: remaining };
  });
  return { ...session, timers, updatedAt: now };
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
