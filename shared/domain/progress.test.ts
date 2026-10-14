import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import {
  advanceStep,
  checkFinish,
  completionSummary,
  finishCooking,
  previousStep,
  progressSummary,
  resolveSession,
} from "./cooking-session";
import { recipeSchema } from "./recipe-schema";
import {
  SessionTransitionError,
  applySessionTimer,
  goToStep,
  settleSessionTimers,
  startSession,
  transitionSession,
  type CookingSession,
} from "./session";
import { remainingMs } from "./timers";

const recipe = recipeSchema.parse(seedJson);
const T0 = 1_800_000_000_000;
const MIN = 60_000;
const TIMER = "timer:demo-step-2";
const start = () => startSession({ id: "s", recipe, servings: 4, now: T0, lineNames: new Map() });
const ids = (s: CookingSession) => s.steps.map((st) => st.id);
const reload = (s: CookingSession, now: number) => {
  const view = resolveSession(JSON.parse(JSON.stringify(s)), {}, now);
  if (!("session" in view)) throw new Error(view.kind);
  return view.session;
};

describe("progressSummary", () => {
  it("describes the first step with nothing done", () => {
    expect(progressSummary(start())).toMatchObject({
      current: 1,
      total: 3,
      completedCount: 0,
      incomplete: [1, 2, 3],
      isFirst: true,
      isLast: false,
      spoken: "Step 1 of 3, 0 steps done",
    });
  });

  it("ignores completion marks for steps not in the session", () => {
    const s = { ...start(), completedStepIds: ["ghost"] };
    expect(progressSummary(s).completedCount).toBe(0);
  });
});

describe("next and previous", () => {
  it("'Done, next step' completes the current step, moves on and records the time", () => {
    const s = advanceStep(start(), T0 + MIN);
    expect(s.currentStepIndex).toBe(1);
    expect(s.completedStepIds).toEqual([ids(s)[0]]);
    expect(s.updatedAt).toBe(T0 + MIN);
    expect(progressSummary(s)).toMatchObject({
      current: 2,
      completedCount: 1,
      spoken: "Step 2 of 3, 1 step done",
    });
  });

  it("walks intermediate steps to the final one", () => {
    const s = advanceStep(advanceStep(start(), T0 + 1), T0 + 2);
    expect(progressSummary(s)).toMatchObject({ current: 3, isLast: true, completedCount: 2 });
    expect(() => advanceStep(s, T0 + 3)).toThrow(/finish instead/);
  });

  it("going back keeps every completed step and shows the revisited step as done", () => {
    const s = advanceStep(advanceStep(start(), T0 + 1), T0 + 2);
    const back = previousStep(s, T0 + 3);
    expect(back.currentStepIndex).toBe(1);
    expect(back.completedStepIds).toEqual(s.completedStepIds);
    expect(progressSummary(back).currentCompleted).toBe(true);
    // Moving forward again doesn't duplicate the mark.
    expect(advanceStep(back, T0 + 4).completedStepIds).toEqual(s.completedStepIds);
  });

  it("can't go back from the first step", () => {
    expect(() => previousStep(start(), T0)).toThrow(SessionTransitionError);
  });

  it("leaves timers exactly as they were when moving either way", () => {
    let s = advanceStep(start(), T0);
    s = applySessionTimer(s, TIMER, "start", T0 + MIN);
    const timer = s.timers[0];
    s = advanceStep(s, T0 + 2 * MIN);
    expect(s.timers[0]).toEqual(timer);
    s = previousStep(s, T0 + 3 * MIN);
    expect(s.timers[0]).toEqual(timer);
    expect(remainingMs(s.timers[0], T0 + 3 * MIN)).toBe(8 * MIN);
  });

  it("never completes a step when its timer finishes", () => {
    let s = applySessionTimer(advanceStep(start(), T0), TIMER, "start", T0);
    s = settleSessionTimers(s, T0 + 11 * MIN).session;
    expect(s.completedStepIds).toEqual([ids(s)[0]]);
    expect(s.currentStepIndex).toBe(1);
  });

  it("jumping to a step (e.g. from a timer) completes nothing", () => {
    const s = goToStep(start(), 2, T0);
    expect(s.completedStepIds).toEqual([]);
    expect(() => goToStep(start(), 3, T0)).toThrow(/does not exist/);
  });
});

describe("pause and resume", () => {
  it("blocks step changes while paused and restores the same step on resume", () => {
    const moved = advanceStep(start(), T0);
    const paused = transitionSession(moved, "pause", T0 + MIN);
    expect(() => advanceStep(paused, T0 + 2 * MIN)).toThrow(SessionTransitionError);
    expect(() => previousStep(paused, T0 + 2 * MIN)).toThrow(SessionTransitionError);
    const resumed = transitionSession(reload(paused, T0 + 30 * MIN), "resume", T0 + 30 * MIN);
    expect(resumed.currentStepIndex).toBe(1);
    expect(resumed.completedStepIds).toEqual(moved.completedStepIds);
  });

  it("keeps timers running while the session is paused", () => {
    let s = applySessionTimer(advanceStep(start(), T0), TIMER, "start", T0);
    s = transitionSession(s, "pause", T0 + MIN);
    expect(remainingMs(reload(s, T0 + 4 * MIN).timers[0], T0 + 4 * MIN)).toBe(6 * MIN);
  });
});

describe("finishing", () => {
  const atLast = () => advanceStep(advanceStep(start(), T0 + 1), T0 + 2);

  it("completes on the final step, marks it done and records the time", () => {
    const done = finishCooking(atLast(), T0 + 30 * MIN);
    expect(done).toMatchObject({ status: "completed", completedAt: T0 + 30 * MIN });
    expect(progressSummary(done).completedCount).toBe(3);
    expect(completionSummary(done)).toMatchObject({ stepsDone: 3, minutes: 30, servings: 4 });
  });

  it("refuses to finish while earlier steps aren't done, and says which", () => {
    const skipped = goToStep(start(), 2, T0);
    expect(checkFinish(skipped, T0)).toEqual({ kind: "incomplete-steps", steps: [1, 2] });
    expect(() => finishCooking(skipped, T0)).toThrow(/steps 1, 2 aren't done/);
  });

  it("asks before stopping running or paused timers, then stops them", () => {
    let s = atLast();
    s = applySessionTimer(s, TIMER, "start", T0 + 3);
    const check = checkFinish(s, T0 + MIN);
    expect(check.kind).toBe("timers-running");
    expect(() => finishCooking(s, T0 + MIN)).toThrow(/still running/);
    const done = finishCooking(s, T0 + MIN, { stopTimers: true });
    expect(done.status).toBe("completed");
    expect(done.timers[0].status).toBe("idle");
  });

  it("doesn't ask about a timer that has already run out", () => {
    const s = applySessionTimer(atLast(), TIMER, "start", T0);
    expect(checkFinish(s, T0 + 11 * MIN).kind).toBe("ready");
    expect(finishCooking(s, T0 + 11 * MIN).timers[0].status).toBe("done");
  });

  it("ignores a duplicate finish (double tap, second tab)", () => {
    const done = finishCooking(atLast(), T0 + 5);
    expect(checkFinish(done, T0 + 6).kind).toBe("already-completed");
    expect(finishCooking(done, T0 + 6)).toBe(done);
    expect(done.completedAt).toBe(T0 + 5);
  });

  it("requires resuming a paused session before finishing", () => {
    const paused = transitionSession(atLast(), "pause", T0 + 5);
    expect(checkFinish(paused, T0 + 6)).toEqual({ kind: "not-active", status: "paused" });
    expect(() => finishCooking(paused, T0 + 6)).toThrow(/resume/);
  });

  it("isn't available early: nothing completes before the last step", () => {
    expect(() => advanceStep(advanceStep(advanceStep(start(), 1), 2), 3)).toThrow();
    expect(completionSummary(atLast())).toBeNull();
  });

  it("stays completed after a refresh or an old link", () => {
    const done = finishCooking(atLast(), T0 + 5);
    const view = resolveSession(JSON.parse(JSON.stringify(done)), {}, T0 + 99 * MIN);
    expect(view.kind).toBe("completed");
  });
});

describe("refresh and recovery", () => {
  it("restores the exact step, completed steps and timers", () => {
    let s = advanceStep(start(), T0);
    s = applySessionTimer(s, TIMER, "start", T0 + MIN);
    const back = reload(s, T0 + 3 * MIN);
    expect(back.currentStepIndex).toBe(1);
    expect(back.completedStepIds).toEqual(s.completedStepIds);
    expect(remainingMs(back.timers[0], T0 + 3 * MIN)).toBe(8 * MIN);
  });

  it("repairs an invalid stored step index instead of crashing", () => {
    const view = resolveSession({ ...start(), currentStepIndex: -4 }, {}, T0);
    expect(view.kind).toBe("corrupt"); // negative fails the schema outright
    const high = resolveSession({ ...start(), currentStepIndex: 99 }, {}, T0);
    expect(high.kind === "cooking" && high.stepIndex).toBe(2);
  });

  it("exiting mid-cook leaves the session resumable, not abandoned", () => {
    const s = advanceStep(start(), T0);
    expect(reload(s, T0 + 60 * MIN).status).toBe("active");
  });
});
