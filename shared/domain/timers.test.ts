import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { recipeSchema } from "./recipe-schema";
import {
  applySessionTimer,
  cookingSessionSchema,
  rehydrateSession,
  settleSessionTimers,
  startSession,
  transitionSession,
} from "./session";
import {
  TimerError,
  applyTimerAction,
  createTimer,
  describeDuration,
  formatRemaining,
  nextExpiry,
  pendingAlerts,
  remainingMs,
  sessionTimerSchema,
  settleTimers,
} from "./timers";

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const timer = (seconds = 600, id = "t1") =>
  createTimer({ id, stepId: "s1", durationSeconds: seconds, label: "Simmer base" });

describe("timer lifecycle", () => {
  it("starts with an expiration derived from now", () => {
    const t = applyTimerAction(timer(), "start", T0);
    expect(t).toMatchObject({ status: "running", startedAt: T0, endsAt: T0 + 10 * MIN });
    expect(remainingMs(t, T0 + 2 * MIN)).toBe(8 * MIN);
  });

  it("pauses with the exact remaining time and resumes with a new expiration", () => {
    let t = applyTimerAction(timer(), "start", T0);
    t = applyTimerAction(t, "pause", T0 + 3 * MIN + 250);
    expect(t).toMatchObject({ status: "paused", endsAt: null, remainingMs: 7 * MIN - 250 });
    // Paused time doesn't count.
    expect(remainingMs(t, T0 + 60 * MIN)).toBe(7 * MIN - 250);
    t = applyTimerAction(t, "resume", T0 + 20 * MIN);
    expect(t.endsAt).toBe(T0 + 20 * MIN + 7 * MIN - 250);
    expect(t.startedAt).toBe(T0);
  });

  it("does not drift over many pause/resume cycles", () => {
    let t = applyTimerAction(timer(), "start", T0);
    let clock = T0;
    let running = 0;
    for (let i = 0; i < 500; i++) {
      clock += 333; // run 333 ms
      running += 333;
      t = applyTimerAction(t, "pause", clock);
      clock += 1_777; // paused 1.777 s
      t = applyTimerAction(t, "resume", clock);
    }
    expect(remainingMs(t, clock)).toBe(10 * MIN - running);
  });

  it("cancels back to a full, idle timer", () => {
    const t = applyTimerAction(applyTimerAction(timer(), "start", T0), "cancel", T0 + MIN);
    expect(t).toMatchObject({
      status: "idle",
      endsAt: null,
      startedAt: null,
      remainingMs: 10 * MIN,
    });
    const p = applyTimerAction(
      applyTimerAction(applyTimerAction(timer(), "start", T0), "pause", T0 + MIN),
      "cancel",
      T0 + 2 * MIN,
    );
    expect(p.status).toBe("idle");
  });

  it("expires exactly at endsAt and records when", () => {
    const t = applyTimerAction(timer(), "start", T0);
    expect(settleTimers([t], T0 + 10 * MIN - 1).finished).toEqual([]);
    const { timers, finished } = settleTimers([t], T0 + 10 * MIN);
    expect(finished).toEqual(["t1"]);
    expect(timers[0]).toMatchObject({
      status: "done",
      finishedAt: T0 + 10 * MIN,
      remainingMs: 0,
      acknowledged: false,
    });
  });

  it("can't pause a timer that has already run out", () => {
    const t = applyTimerAction(timer(), "start", T0);
    expect(() => applyTimerAction(t, "pause", T0 + 11 * MIN)).toThrow(TimerError);
  });

  it("acknowledges and resets a finished timer", () => {
    const [done] = settleTimers([applyTimerAction(timer(), "start", T0)], T0 + 10 * MIN).timers;
    const seen = applyTimerAction(done, "acknowledge", T0 + 11 * MIN);
    expect(seen.acknowledged).toBe(true);
    expect(pendingAlerts([seen])).toEqual([]);
    expect(applyTimerAction(seen, "reset", T0 + 12 * MIN)).toMatchObject({
      status: "idle",
      remainingMs: 10 * MIN,
      finishedAt: null,
    });
  });

  it("rejects actions that don't fit the state", () => {
    expect(() => applyTimerAction(timer(), "pause", T0)).toThrow(TimerError);
    expect(() => applyTimerAction(timer(), "resume", T0)).toThrow(TimerError);
    expect(() => applyTimerAction(applyTimerAction(timer(), "start", T0), "start", T0 + 1)).toThrow(
      TimerError,
    );
  });
});

describe("invalid durations", () => {
  it.each([0, 4, -10, 2.5, 86_401, NaN])("rejects %s seconds", (d) => {
    expect(() => createTimer({ id: "x", stepId: "s", durationSeconds: d })).toThrow(TimerError);
  });

  it("rejects corrupt stored timers", () => {
    expect(sessionTimerSchema.safeParse({ ...timer(), durationSeconds: 1 }).success).toBe(false);
    expect(sessionTimerSchema.safeParse({ ...timer(), status: "ticking" }).success).toBe(false);
  });
});

describe("multiple timers", () => {
  it("run independently and settle independently", () => {
    const a = applyTimerAction(timer(600, "a"), "start", T0);
    const b = applyTimerAction(timer(120, "b"), "start", T0 + MIN);
    const c = timer(300, "c");
    expect(nextExpiry([a, b, c])).toBe(T0 + 3 * MIN);
    const first = settleTimers([a, b, c], T0 + 4 * MIN);
    expect(first.finished).toEqual(["b"]);
    expect(first.timers.map((t) => t.status)).toEqual(["running", "done", "idle"]);
    const second = settleTimers(first.timers, T0 + 10 * MIN);
    expect(second.finished).toEqual(["a"]);
    expect(pendingAlerts(second.timers).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("reports nothing to wake for when none run", () => {
    expect(nextExpiry([timer()])).toBeNull();
  });
});

describe("clock changes", () => {
  it("never shows more than the full duration if the clock moves backwards", () => {
    const t = applyTimerAction(timer(), "start", T0);
    expect(remainingMs(t, T0 - 60 * MIN)).toBe(10 * MIN);
  });

  it("treats a clock jump past the end as expiry (no server time to check against)", () => {
    const t = applyTimerAction(timer(), "start", T0);
    expect(settleTimers([t], T0 + 24 * 60 * MIN).finished).toEqual(["t1"]);
  });
});

describe("formatting", () => {
  it.each([
    [600_000, "10:00"],
    [599_001, "10:00"],
    [59_000, "0:59"],
    [1, "0:01"],
    [0, "0:00"],
    [3_725_000, "1:02:05"],
  ])("formats %s ms as %s", (ms, text) => {
    expect(formatRemaining(ms)).toBe(text);
  });

  it("describes durations for labels and screen readers", () => {
    expect(describeDuration(600)).toBe("10 minutes");
    expect(describeDuration(3_905)).toBe("1 hour 5 minutes 5 seconds");
    expect(describeDuration(1)).toBe("1 second");
  });
});

describe("timers inside a cooking session", () => {
  const recipe = recipeSchema.parse(seedJson);
  const session = () =>
    startSession({ id: "s", recipe, servings: 4, now: T0, lineNames: new Map() });
  const id = "timer:demo-step-2";

  it("creates labelled, idle timers from the recipe's step timers", () => {
    expect(session().timers).toEqual([
      expect.objectContaining({ id, stepId: "demo-step-2", label: "Simmer base", status: "idle" }),
    ]);
  });

  it("recovers a running timer after a refresh without resetting it", () => {
    const running = applySessionTimer(session(), id, "start", T0);
    const stored = JSON.parse(JSON.stringify(running));
    const back = rehydrateSession(stored, T0 + 4 * MIN);
    expect(back.timers[0]).toMatchObject({ status: "running", endsAt: T0 + 10 * MIN });
    expect(remainingMs(back.timers[0], T0 + 4 * MIN)).toBe(6 * MIN);
  });

  it("returns after the expected expiry as finished, stamped when it actually ran out", () => {
    const running = applySessionTimer(session(), id, "start", T0);
    const back = rehydrateSession(JSON.parse(JSON.stringify(running)), T0 + 45 * MIN);
    expect(back.timers[0]).toMatchObject({ status: "done", finishedAt: T0 + 10 * MIN });
    expect(pendingAlerts(back.timers)).toHaveLength(1);
  });

  it("keeps a paused timer paused across a refresh", () => {
    let s = applySessionTimer(session(), id, "start", T0);
    s = applySessionTimer(s, id, "pause", T0 + 2 * MIN);
    const back = rehydrateSession(JSON.parse(JSON.stringify(s)), T0 + 90 * MIN);
    expect(back.timers[0]).toMatchObject({ status: "paused", remainingMs: 8 * MIN });
  });

  it("keeps timers running while the session itself is paused", () => {
    let s = applySessionTimer(session(), id, "start", T0);
    s = transitionSession(s, "pause", T0 + MIN);
    expect(settleSessionTimers(s, T0 + 10 * MIN).finished).toEqual([id]);
  });

  it("never marks the step complete when its timer finishes", () => {
    const s = applySessionTimer(session(), id, "start", T0);
    const { session: settled } = settleSessionTimers(s, T0 + 11 * MIN);
    expect(settled.completedStepIds).toEqual([]);
    expect(settled.currentStepIndex).toBe(s.currentStepIndex);
  });

  it("refuses timer changes on a finished session or for unknown timers", () => {
    const done = transitionSession(session(), "complete", T0);
    expect(() => applySessionTimer(done, id, "start", T0)).toThrow(TimerError);
    expect(() => applySessionTimer(session(), "nope", "start", T0)).toThrow(/not part/);
  });

  it("reads timers saved before Phase 25", () => {
    const legacy = {
      ...session(),
      timers: [
        {
          id,
          stepId: "demo-step-2",
          durationSeconds: 600,
          status: "paused",
          endsAt: null,
          remainingSeconds: 540,
        },
      ],
    };
    const parsed = cookingSessionSchema.parse(legacy);
    expect(parsed.timers[0]).toMatchObject({ status: "paused", remainingMs: 540_000 });
  });

  it("settling returns the same object when nothing expired (no needless saves)", () => {
    const s = applySessionTimer(session(), id, "start", T0);
    expect(settleSessionTimers(s, T0 + MIN).session).toBe(s);
  });
});
