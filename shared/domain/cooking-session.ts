import {
  evaluateCookingReadiness,
  maxServingsFor,
  type CookingReadiness,
  type KitchenCheckRecord,
} from "./kitchen-check";
import { recipeSchema, type Recipe, type RecipeStep } from "./recipe-schema";
import { readinessCheck, stepCues, type Cue } from "./cues";
import { formatQuantity, scaleAmount, type Unit } from "./units";
import {
  SessionTransitionError,
  completeStep,
  cookingSessionSchema,
  goToStep,
  isResumable,
  rehydrateSession,
  settleSessionTimers,
  startSession,
  transitionSession,
  type CookingSession,
} from "./session";
import { applyTimerAction, remainingMs, type SessionTimer } from "./timers";

/**
 * Cooking-session lifecycle on top of `session.ts` (Phase 22):
 * guarded creation from a passed Kitchen Check, and safe resolution
 * of a stored session for the Cooking Mode route.
 */

/* ------------------------------------------------------------------ */
/* Creation                                                           */
/* ------------------------------------------------------------------ */

export type CreateFailure =
  | { ok: false; reason: "invalid-recipe"; message: string }
  | { ok: false; reason: "invalid-servings"; message: string }
  | { ok: false; reason: "not-ready"; message: string; readiness: CookingReadiness };

export type CreateResult = { ok: true; session: CookingSession } | CreateFailure;

/** Servings must be a whole number the recipe can scale to. Never clamped silently. */
export function validateServings(recipe: Pick<Recipe, "baseServings">, servings: number): boolean {
  return Number.isInteger(servings) && servings >= 1 && servings <= maxServingsFor(recipe);
}

/**
 * The only way to create a session. Readiness is evaluated here from
 * the recipe and the stored Kitchen Check answers; callers can't pass
 * a verdict in. No step is marked complete; the first step is current.
 */
export function createCookingSession(args: {
  id: string;
  recipe: Recipe;
  servings: number;
  record: KitchenCheckRecord | null;
  ingredientNames: Record<string, string>;
  now: number;
}): CreateResult {
  const { recipe, servings } = args;

  if (!recipeSchema.safeParse(recipe).success) {
    return { ok: false, reason: "invalid-recipe", message: "This recipe's data is invalid." };
  }
  if (!validateServings(recipe, servings)) {
    return {
      ok: false,
      reason: "invalid-servings",
      message: `Servings must be a whole number from 1 to ${maxServingsFor(recipe)}.`,
    };
  }
  // The check must be for exactly this recipe version and serving count.
  const record =
    args.record && args.record.recipeId === recipe.id && args.record.servings === servings
      ? args.record
      : null;

  const readiness = evaluateCookingReadiness({
    recipe,
    servings,
    record,
    ingredientNames: args.ingredientNames,
  });
  if (!readiness.canStartCooking) {
    return {
      ok: false,
      reason: "not-ready",
      message: readiness.blockedReason ?? "Kitchen Check isn't complete.",
      readiness,
    };
  }

  const lineNames = new Map(
    recipe.ingredients.map((l) => [l.id, args.ingredientNames[l.ingredientId] ?? l.ingredientId]),
  );
  const session = cookingSessionSchema.parse({
    ...startSession({ id: args.id, recipe, servings, now: args.now, lineNames }),
    readinessAtStart: "READY",
  });
  return { ok: true, session };
}

/**
 * What to do when a cook starts a recipe that already has an open
 * session: same recipe version and servings → resume it; anything
 * else → the old one is abandoned (kept as history) and a new one starts.
 */
export function reconcileExisting(
  existing: CookingSession | null,
  recipe: Pick<Recipe, "id" | "contentVersion">,
  servings: number,
  now: number,
): { resume: CookingSession | null; abandon: CookingSession | null } {
  if (!existing || existing.recipeId !== recipe.id || !isResumable(existing)) {
    return { resume: null, abandon: null };
  }
  if (
    existing.servings === servings &&
    existing.contentVersion === recipe.contentVersion &&
    existing.steps.length > 0
  ) {
    return { resume: existing, abandon: null };
  }
  return { resume: null, abandon: transitionSession(existing, "abandon", now) };
}

/* ------------------------------------------------------------------ */
/* Resolution for the Cooking Mode route                              */
/* ------------------------------------------------------------------ */

export interface CatalogEntry {
  title: string;
  slug: string;
  contentVersion: number;
}

export type SessionView =
  | { kind: "not-found" }
  | { kind: "corrupt" }
  | { kind: "no-snapshot"; session: CookingSession }
  | { kind: "completed"; session: CookingSession }
  | { kind: "abandoned"; session: CookingSession }
  | {
      kind: "cooking";
      session: CookingSession;
      step: RecipeStep;
      stepIndex: number;
      stepCount: number;
      /** The recipe has been republished since this session started. */
      recipeUpdated: boolean;
      /** The recipe is no longer in the catalog; the session still works from its snapshot. */
      recipeMissing: boolean;
      /** The stored step index was out of range and has been clamped. */
      stepRepaired: boolean;
    };

/**
 * Turn whatever is stored under a session id into something the
 * route can render. Never reactivates a finished session, never
 * swaps in live recipe instructions.
 */
export function resolveSession(
  raw: unknown,
  catalog: Record<string, CatalogEntry>,
  now: number,
): SessionView {
  if (raw === null || raw === undefined) return { kind: "not-found" };
  let session: CookingSession;
  try {
    session = rehydrateSession(raw, now);
  } catch {
    return { kind: "corrupt" };
  }

  if (session.status === "completed") return { kind: "completed", session };
  if (session.status === "abandoned") return { kind: "abandoned", session };
  if (session.steps.length === 0) return { kind: "no-snapshot", session };

  const count = session.steps.length;
  const stepIndex = Math.min(Math.max(session.currentStepIndex, 0), count - 1);
  const stepRepaired = stepIndex !== session.currentStepIndex;
  const entry = catalog[session.recipeId];

  const step = session.steps[stepIndex];
  if (!step) return { kind: "corrupt" };

  return {
    kind: "cooking",
    session: stepRepaired ? { ...session, currentStepIndex: stepIndex } : session,
    step,
    stepIndex,
    stepCount: count,
    recipeUpdated: Boolean(entry) && entry.contentVersion !== session.contentVersion,
    recipeMissing: !entry,
    stepRepaired,
  };
}

/* ------------------------------------------------------------------ */
/* Step presentation (Phase 23)                                       */
/* ------------------------------------------------------------------ */

const HEAT_LABEL: Record<NonNullable<RecipeStep["heat"]>, string> = {
  low: "Low heat",
  "medium-low": "Medium-low heat",
  medium: "Medium heat",
  "medium-high": "Medium-high heat",
  high: "High heat",
};

export type QuantityKind = "amount" | "to-taste" | "unspecified";

/**
 * How this step's amount relates to the line's total:
 * - "all": the step handles the whole line.
 * - "part": the step handles a stated part of it (`totalQuantity` given).
 * - "recipe-total": the line is used in several steps and the recipe
 *   doesn't say how much goes in here, so the total is shown as a total.
 */
export type Portion = "all" | "part" | "recipe-total";

export interface StepIngredient {
  lineId: string;
  name: string;
  preparation: string | null;
  note: string | null;
  kind: QuantityKind;
  /** Human-readable amount for this step ("400 g", "1½ cup", "To taste"). */
  quantity: string;
  approximate: boolean;
  /** The amount wasn't scaled (manual line); the cook adjusts by judgement. */
  notScaled: boolean;
  portion: Portion;
  /** Line total at the session's servings, when it differs from `quantity`. */
  totalQuantity: string | null;
  /** Other steps (1-based) that also use this line. */
  alsoInSteps: number[];
  /** One sentence a screen reader can read as-is. */
  spoken: string;
}

type SnapshotLine = CookingSession["snapshot"][number];

function amountLabel(amount: number | null, unit: string | null, approximate: boolean) {
  const text = formatQuantity(amount, unit as Unit | null);
  return approximate ? `About ${text}` : text;
}

/**
 * Per-step quantities, from explicit step references only (never text
 * matching). Amounts go through `scaleAmount` — the same rule the
 * ingredient list uses — at the servings frozen in the session.
 */
export function stepIngredients(session: CookingSession, index: number): StepIngredient[] {
  const step = session.steps[index];
  if (!step) return [];
  const byLine = new Map(session.snapshot.map((l) => [l.lineId, l]));

  return step.ingredientIds.flatMap((lineId): StepIngredient[] => {
    const line = byLine.get(lineId);
    if (!line) return [];
    const alsoInSteps = session.steps
      .map((s, i) => (i !== index && s.ingredientIds.includes(lineId) ? i + 1 : null))
      .filter((n): n is number => n !== null);
    const allocation = step.ingredientQuantities?.[lineId];
    const resolved = resolveStepAmount(session, line, allocation, alsoInSteps.length > 0);

    const name = line.name;
    const prep = line.preparation ?? null;
    return [
      {
        lineId,
        name,
        preparation: prep,
        note: line.note ?? null,
        alsoInSteps,
        ...resolved,
        spoken: spokenLine(name, prep, resolved, alsoInSteps, line.note ?? null),
      },
    ];
  });
}

export function stepList(steps: number[]): string {
  if (steps.length <= 1) return `step ${steps[0]}`;
  return `steps ${steps.slice(0, -1).join(", ")} and ${steps[steps.length - 1]}`;
}

function spokenLine(
  name: string,
  prep: string | null,
  r: Pick<StepIngredient, "kind" | "quantity" | "portion" | "totalQuantity" | "notScaled">,
  alsoInSteps: number[],
  note: string | null,
): string {
  const parts = [
    `${name}${prep ? `, ${prep}` : ""}: ${r.kind === "amount" ? r.quantity : r.quantity.toLowerCase()}`,
  ];
  if (r.portion === "part" && r.totalQuantity) parts.push(`part of ${r.totalQuantity} in total`);
  if (r.portion === "recipe-total" && r.kind === "amount") parts.push("total for the whole recipe");
  if (r.portion === "recipe-total" && r.totalQuantity) parts.push(`${r.totalQuantity} in total`);
  if (alsoInSteps.length > 0) parts.push(`also used in ${stepList(alsoInSteps)}`);
  if (r.notScaled) parts.push("not adjusted for servings");
  return parts.join(", ") + "." + (note ? ` ${note}` : "");
}

function resolveStepAmount(
  session: CookingSession,
  line: SnapshotLine,
  allocation: number | null | undefined,
  shared: boolean,
): Pick<
  StepIngredient,
  "kind" | "quantity" | "approximate" | "notScaled" | "portion" | "totalQuantity"
> {
  const approximate = Boolean(line.approximate);
  const notScaled = Boolean(line.requiresManual);

  // To-taste lines never get a number, whatever the step says.
  if (
    line.scaling === "to-taste" ||
    (line.scaledQuantity === null && line.unit === null && !line.scaling)
  ) {
    return {
      kind: "to-taste",
      quantity: "To taste",
      approximate: false,
      notScaled: false,
      portion: "all",
      totalQuantity: null,
    };
  }
  if (line.scaledQuantity === null) {
    return {
      kind: "unspecified",
      quantity: "Amount not given",
      approximate: false,
      notScaled,
      portion: "all",
      totalQuantity: null,
    };
  }

  const total = amountLabel(line.scaledQuantity, line.unit, approximate);

  // A stated per-step amount: scale it with the same rule as the line.
  if (typeof allocation === "number" && line.baseQuantity != null && session.baseServings) {
    if (Math.abs(allocation - line.baseQuantity) < 1e-9) {
      return {
        kind: "amount",
        quantity: total,
        approximate,
        notScaled,
        portion: "all",
        totalQuantity: null,
      };
    }
    const scaled = scaleAmount(
      allocation,
      session.baseServings,
      session.servings,
      line.scaling ?? "linear",
      line.unit as Unit | null,
    );
    return {
      kind: "amount",
      quantity: amountLabel(scaled.amount, line.unit, approximate || scaled.approximate),
      approximate: approximate || scaled.approximate,
      notScaled: scaled.requiresManual,
      portion: "part",
      totalQuantity: total,
    };
  }

  // Explicitly no fixed amount for this step.
  if (allocation === null) {
    return {
      kind: "unspecified",
      quantity: "As needed",
      approximate: false,
      notScaled,
      portion: "recipe-total",
      totalQuantity: total,
    };
  }

  // No per-step amount: the whole line, unless other steps share it.
  return {
    kind: "amount",
    quantity: total,
    approximate,
    notScaled,
    portion: shared ? "recipe-total" : "all",
    totalQuantity: null,
  };
}

export interface StepDisplay {
  id: string;
  number: number;
  total: number;
  /** Verbatim from the recipe step. Never rewritten. */
  instruction: string;
  ingredients: StepIngredient[];
  heat: string | null;
  /** "About 20 min", from `estimatedMinutes` or the step timer. */
  duration: string | null;
  timerLabel: string | null;
  /** Sensory cues in a fixed order (look, feel, smell, listen, other). */
  cues: Cue[];
  preparationNotes: string | null;
  /** What to check before moving on. Separate from any timer. */
  completionNote: string | null;
  safetyNote: string | null;
  /** Photo of the step, when the recipe has one. */
  image: { src: string; alt: string } | null;
  /** The line to repeat when a timer runs out (completion, else first cue). */
  readinessCheck: string | null;
  isFirst: boolean;
  isLast: boolean;
  completed: boolean;
}

function minutesLabel(minutes: number): string {
  if (minutes < 1) return "Under a minute";
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} hr ${rest} min` : `${h} hr`;
}

/**
 * Everything Cooking Mode shows for one step, derived from the
 * session alone (its step copy and scaled ingredient snapshot), so
 * quantities match the servings the cook started with. Missing
 * metadata is null; nothing is filled in by guesswork.
 */
export function stepDisplay(session: CookingSession, index: number): StepDisplay | null {
  const step = session.steps[index];
  if (!step) return null;
  const ingredients = stepIngredients(session, index);
  const timerSeconds = step.timer?.durationSeconds;
  const duration =
    step.estimatedMinutes !== undefined
      ? `About ${minutesLabel(step.estimatedMinutes)}`
      : timerSeconds !== undefined
        ? minutesLabel(timerSeconds / 60)
        : null;

  return {
    id: step.id,
    number: index + 1,
    total: session.steps.length,
    instruction: step.instruction,
    ingredients,
    heat: step.heat ? HEAT_LABEL[step.heat] : null,
    duration,
    timerLabel: step.timer?.label ?? null,
    cues: stepCues(step),
    preparationNotes: step.preparationNotes?.trim() || null,
    completionNote: step.completionNote?.trim() || null,
    safetyNote: step.safetyNote?.trim() || null,
    image: step.image ?? null,
    readinessCheck: readinessCheck(step),
    isFirst: index === 0,
    isLast: index === session.steps.length - 1,
    completed: session.completedStepIds.includes(step.id),
  };
}

/* ------------------------------------------------------------------ */
/* Progress (Phase 26)                                                */
/* ------------------------------------------------------------------ */

/**
 * Progress rules
 *
 * - A step becomes complete only when the cook moves on from it with
 *   "Done, next step" or finishes on it. Timers never complete steps.
 * - Going back never removes progress: a revisited step keeps its
 *   "done" state and its timer is left exactly as it was.
 * - Jumping to another step (e.g. from a timer) moves without
 *   completing anything.
 * - Finishing needs every step complete (the current one is completed
 *   by the finish itself). Running or paused timers must be confirmed
 *   and are then stopped. Finishing a finished session is a no-op.
 * - Steps only move while the session is active; while paused, the
 *   cook must resume first. Timers keep running while paused.
 */

export interface ProgressSummary {
  /** 1-based position of the current step. */
  current: number;
  total: number;
  completedCount: number;
  /** 1-based numbers of steps not yet completed. */
  incomplete: number[];
  isFirst: boolean;
  isLast: boolean;
  currentCompleted: boolean;
  /** Spoken form, e.g. "Step 3 of 8, 2 steps done". */
  spoken: string;
}

export function progressSummary(session: CookingSession): ProgressSummary {
  const total = session.steps.length;
  const index = Math.min(Math.max(session.currentStepIndex, 0), Math.max(total - 1, 0));
  // Ignore completion marks for steps that aren't in this session's copy.
  const done = new Set(
    session.completedStepIds.filter((id) => session.steps.some((s) => s.id === id)),
  );
  const incomplete = session.steps.flatMap((s, i) => (done.has(s.id) ? [] : [i + 1]));
  const current = index + 1;
  return {
    current,
    total,
    completedCount: done.size,
    incomplete,
    isFirst: index === 0,
    isLast: index === total - 1,
    currentCompleted: Boolean(session.steps[index] && done.has(session.steps[index].id)),
    spoken: `Step ${current} of ${total}, ${done.size} ${done.size === 1 ? "step" : "steps"} done`,
  };
}

/** "Done, next step": complete the current step and move to the next. */
export function advanceStep(session: CookingSession, now: number): CookingSession {
  if (session.status !== "active") {
    throw new SessionTransitionError(`cannot advance a ${session.status} session`);
  }
  const step = session.steps[session.currentStepIndex];
  if (!step) throw new SessionTransitionError("the current step does not exist");
  if (session.currentStepIndex >= session.steps.length - 1) {
    throw new SessionTransitionError("already on the last step; finish instead");
  }
  return goToStep(completeStep(session, step.id, now), session.currentStepIndex + 1, now);
}

/** Back one step. Progress and timers are untouched. */
export function previousStep(session: CookingSession, now: number): CookingSession {
  if (session.currentStepIndex <= 0) {
    throw new SessionTransitionError("already on the first step");
  }
  return goToStep(session, session.currentStepIndex - 1, now);
}

export type FinishCheck =
  | { kind: "ready" }
  | { kind: "already-completed" }
  | { kind: "not-active"; status: CookingSession["status"] }
  | { kind: "incomplete-steps"; steps: number[] }
  | { kind: "timers-running"; timers: SessionTimer[] };

/** What would happen if the cook pressed Finish now. */
export function checkFinish(session: CookingSession, now: number): FinishCheck {
  if (session.status === "completed") return { kind: "already-completed" };
  if (session.status !== "active") return { kind: "not-active", status: session.status };
  const currentId = session.steps[session.currentStepIndex]?.id;
  const missing = progressSummary(session).incomplete.filter(
    (n) => session.steps[n - 1]?.id !== currentId,
  );
  if (missing.length > 0) return { kind: "incomplete-steps", steps: missing };
  const live = session.timers.filter(
    (t) => (t.status === "running" && remainingMs(t, now) > 0) || t.status === "paused",
  );
  if (live.length > 0) return { kind: "timers-running", timers: live };
  return { kind: "ready" };
}

/**
 * Complete the session. Idempotent: a second Finish (double tap, two
 * tabs) returns the completed session unchanged. With
 * `stopTimers: true`, running/paused timers are cancelled first.
 */
export function finishCooking(
  session: CookingSession,
  now: number,
  options: { stopTimers?: boolean } = {},
): CookingSession {
  const check = checkFinish(session, now);
  switch (check.kind) {
    case "already-completed":
      return session;
    case "not-active":
      throw new SessionTransitionError(`resume the session before finishing (${check.status})`);
    case "incomplete-steps":
      throw new SessionTransitionError(`steps ${check.steps.join(", ")} aren't done yet`);
    case "timers-running":
      if (!options.stopTimers) {
        throw new SessionTransitionError("a timer is still running");
      }
  }
  const settled = settleSessionTimers(session, now).session;
  const timers = settled.timers.map((t) =>
    t.status === "running" || t.status === "paused" ? applyTimerAction(t, "cancel", now) : t,
  );
  const current = settled.steps[settled.currentStepIndex];
  const withStep = current ? completeStep({ ...settled, timers }, current.id, now) : settled;
  return transitionSession(withStep, "complete", now);
}

export interface CompletionSummary {
  recipeTitle: string;
  servings: number;
  stepsDone: number;
  /** Start to finish, including pauses. */
  minutes: number;
  completedAt: number;
}

export function completionSummary(session: CookingSession): CompletionSummary | null {
  if (session.status !== "completed" || session.completedAt === null) return null;
  return {
    recipeTitle: session.recipeTitle ?? "Your recipe",
    servings: session.servings,
    stepsDone: progressSummary(session).completedCount,
    minutes: Math.max(1, Math.round((session.completedAt - session.createdAt) / 60_000)),
    completedAt: session.completedAt,
  };
}
