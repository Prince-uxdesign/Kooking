import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { advanceStep, checkFinish, previousStep, resolveSession } from "./cooking-session";
import { recipeSchema } from "./recipe-schema";
import {
  MAX_EXTRA_TIMERS,
  addSessionTimer,
  applySessionTimer,
  extraTimerLabel,
  goToStep,
  startSession,
  stepTimerFor,
  transitionSession,
  type CookingSession,
} from "./session";
import { TimerError, remainingMs } from "./timers";
import { parseVoiceCommand, type VoiceCommand } from "./voice-commands";
import { lookupIngredient, planVoiceCommand, type SpeechState } from "./voice-plan";

const recipe = recipeSchema.parse(seedJson);
const T0 = 1_800_000_000_000;
const names = new Map([
  ["demo-rice", "Long-grain rice"],
  ["demo-tomato-paste", "Tomato paste"],
  ["demo-salt", "Salt"],
  ["demo-plantain", "Plantain"],
]);
const start = (servings = 4) =>
  startSession({ id: "s", recipe, servings, now: T0, lineNames: names });
const at = (s: CookingSession, step: number) => goToStep(s, step, T0);
const RECIPE_TIMER = "timer:demo-step-2";

const cmd = (text: string): VoiceCommand => {
  const r = parseVoiceCommand(text);
  if (!r.ok) throw new Error(`not a command: ${text}`);
  return r.command;
};
const plan = (text: string, session: CookingSession, speech: SpeechState = "idle", now = T0) =>
  planVoiceCommand(cmd(text), { session, now, speech });

describe("ingredient lookups", () => {
  it("answers from the session's scaled snapshot for the chosen servings", () => {
    const r = lookupIngredient(start(), 0, "rice");
    expect(r).toMatchObject({ kind: "found" });
    expect(r.kind === "found" && r.text).toBe(
      "Long-grain rice, rinsed: 400 g in total for 4 servings.",
    );
    expect(r.kind === "found" && r.segments).toEqual([
      "Long-grain rice, rinsed: 400 grams in total for 4 servings.",
    ]);
    const eight = lookupIngredient(start(8), 0, "rice");
    expect(eight.kind === "found" && eight.text).toContain("800 g in total for 8 servings");
  });

  it("matches plurals and partial names, case-insensitively", () => {
    expect(lookupIngredient(start(), 0, "Plantains").kind).toBe("found");
    expect(lookupIngredient(start(), 0, "tomato paste").kind).toBe("found");
    expect(lookupIngredient(start(), 0, "long grain rice").kind).toBe("found");
  });

  it("says 'to taste' for to-taste lines and never invents an amount", () => {
    const r = lookupIngredient(start(), 1, "salt");
    expect(r.kind === "found" && r.text).toBe("Salt: to taste.");
    expect(r.kind === "found" && r.text).not.toMatch(/\d/);
  });

  it("reports an ingredient that isn't in the recipe", () => {
    expect(lookupIngredient(start(), 0, "chicken")).toEqual({ kind: "missing", query: "chicken" });
    expect(lookupIngredient(start(), 0, "the")).toMatchObject({ kind: "missing" });
  });

  it("asks which one when several lines match", () => {
    const s = start();
    const twoTomatoes = {
      ...s,
      snapshot: [...s.snapshot, { ...s.snapshot[1], lineId: "puree", name: "Tomato purée" }],
    };
    expect(lookupIngredient(twoTomatoes, 0, "tomato")).toEqual({
      kind: "ambiguous",
      names: ["Tomato paste", "Tomato purée"],
    });
    // An exact name wins over a longer one.
    const riceTwice = {
      ...s,
      snapshot: [...s.snapshot, { ...s.snapshot[0], lineId: "flour", name: "Rice flour" }],
    };
    expect(lookupIngredient(riceTwice, 0, "rice flour").kind).toBe("found");
    expect(lookupIngredient(riceTwice, 0, "rice").kind).toBe("ambiguous");
  });

  it("adds the step's share when the step uses part of a line", () => {
    const s = start();
    const split = {
      ...s,
      steps: s.steps.map((st, i) =>
        i === 0 ? { ...st, ingredientQuantities: { "demo-rice": 100 } } : st,
      ),
    };
    const r = lookupIngredient(split, 0, "rice");
    expect(r.kind === "found" && r.text).toBe(
      "Long-grain rice, rinsed: 400 g in total for 4 servings. This step uses 100 g.",
    );
  });
});

describe("planning: reading", () => {
  it("repeat replays the current step through read-aloud", () => {
    expect(plan("repeat that", start())).toEqual({
      kind: "replay-step",
      ack: "Reading step 1 again",
    });
  });

  it("repeat explains when read-aloud isn't available", () => {
    expect(plan("repeat that", start(), "unsupported")).toMatchObject({ kind: "explain" });
  });

  it("'what's the next step' reads the next step without moving", () => {
    const s = start();
    const p = plan("what's the next step", s);
    expect(p).toMatchObject({ kind: "answer", ack: "Next is step 2" });
    expect(p.kind === "answer" && p.segments[0]).toBe("Next.");
    expect(p.kind === "answer" && p.segments).toContain("Step 2 of 3.");
    expect(p.kind === "answer" && p.text).toContain(s.steps[1].instruction);
    expect(s.currentStepIndex).toBe(0);
  });

  it("there's no next step on the last step", () => {
    expect(plan("what's next", at(start(), 2))).toMatchObject({ kind: "explain" });
  });
});

describe("planning: navigation boundaries", () => {
  it("next and previous within the recipe", () => {
    expect(plan("next step", start())).toEqual({
      kind: "navigate",
      direction: "next",
      ack: "Step 1 done. Now on step 2",
    });
    expect(plan("previous step", at(start(), 1))).toEqual({
      kind: "navigate",
      direction: "previous",
      ack: "Back to step 1",
    });
  });

  it("won't go before the first step or past the last (finish stays a button)", () => {
    expect(plan("previous step", start())).toMatchObject({ kind: "explain" });
    const last = plan("next step", at(start(), 2));
    expect(last).toMatchObject({ kind: "explain" });
    expect(last.kind === "explain" && last.text).toMatch(/Finish cooking/);
  });

  it("respects a paused session, like the buttons", () => {
    const paused = transitionSession(start(), "pause", T0);
    expect(plan("next step", paused)).toMatchObject({ kind: "explain" });
    expect(plan("previous step", paused)).toMatchObject({ kind: "explain" });
  });

  it("a duplicate 'next step' is harmless at the domain level too: one advance per command", () => {
    const s = start();
    const once = advanceStep(s, T0);
    // The same plan applied to the stale session (as a duplicate would be) gives the same result.
    expect(advanceStep(s, T0).currentStepIndex).toBe(once.currentStepIndex);
    expect(previousStep(once, T0).currentStepIndex).toBe(0);
  });
});

describe("planning: pause and resume", () => {
  const running = () => applySessionTimer(at(start(), 1), RECIPE_TIMER, "start", T0);

  it("pauses the only running thing", () => {
    expect(plan("pause", running())).toMatchObject({
      kind: "timer",
      timerId: RECIPE_TIMER,
      action: "pause",
      ack: "Simmer base paused",
    });
    expect(plan("pause", start(), "playing")).toEqual({
      kind: "speech",
      action: "pause",
      ack: "Reading paused",
    });
  });

  it("asks which when reading and a timer are both running", () => {
    expect(plan("pause", running(), "playing")).toMatchObject({ kind: "clarify" });
    expect(plan("pause the timer", running(), "playing")).toMatchObject({ kind: "timer" });
    expect(plan("pause reading", running(), "playing")).toMatchObject({ kind: "speech" });
  });

  it("asks which when several timers are running", () => {
    const two = addSessionTimer(running(), 300, T0).session;
    const p = plan("pause", two);
    expect(p).toMatchObject({ kind: "clarify" });
    expect(p.kind === "clarify" && p.text).toMatch(/2 timers/);
  });

  it("explains when there's nothing to pause or resume", () => {
    expect(plan("pause", start())).toMatchObject({ kind: "explain" });
    expect(plan("resume", start())).toMatchObject({ kind: "explain" });
    expect(plan("pause reading", start())).toMatchObject({ kind: "explain" });
    expect(plan("resume the timer", start())).toMatchObject({ kind: "explain" });
  });

  it("doesn't count a timer that already ran out as running", () => {
    expect(plan("pause", running(), "idle", T0 + 11 * 60_000)).toMatchObject({ kind: "explain" });
  });

  it("resumes the only paused thing, and asks when it's unclear", () => {
    const pausedTimer = applySessionTimer(running(), RECIPE_TIMER, "pause", T0 + 1000);
    expect(plan("resume", pausedTimer)).toMatchObject({ kind: "timer", action: "resume" });
    expect(plan("resume", start(), "paused")).toMatchObject({ kind: "speech", action: "resume" });
    expect(plan("resume", pausedTimer, "paused")).toMatchObject({ kind: "clarify" });
  });

  it("points a paused session to the Resume cooking button", () => {
    const p = plan("resume", transitionSession(start(), "pause", T0));
    expect(p.kind === "explain" && p.text).toMatch(/Resume cooking/);
  });

  it("stop reading only when something is being read", () => {
    expect(plan("stop reading", start(), "playing")).toMatchObject({
      kind: "speech",
      action: "stop",
    });
    expect(plan("stop reading", start(), "paused")).toMatchObject({
      kind: "speech",
      action: "stop",
    });
    expect(plan("stop reading", start(), "idle")).toMatchObject({ kind: "explain" });
  });

  it("stop listening always turns the mic off", () => {
    expect(plan("stop listening", start(), "playing")).toMatchObject({ kind: "stop-listening" });
  });
});

describe("planning: timers", () => {
  it("plans a timer with a short spoken confirmation", () => {
    expect(plan("start a ten minute timer", start())).toEqual({
      kind: "start-timer",
      seconds: 600,
      ack: "10-minute timer started",
      say: "10 minute timer started.",
    });
  });

  it("explains when the extra-timer limit is reached", () => {
    let s = start();
    for (let i = 0; i < MAX_EXTRA_TIMERS; i++) s = addSessionTimer(s, 60 + i, T0 + i).session;
    expect(plan("start a 5 minute timer", s)).toMatchObject({ kind: "explain" });
  });

  it("ingredient answers, clarifications and misses", () => {
    expect(plan("how much rice do I need", start())).toMatchObject({ kind: "answer" });
    expect(plan("how much chicken do I need", start())).toMatchObject({ kind: "explain" });
  });
});

describe("addSessionTimer (existing timer engine)", () => {
  it("adds and starts a timer for the current step, saved like any other", () => {
    const { session, timerId, reused } = addSessionTimer(start(), 600, T0);
    expect(reused).toBe(false);
    const t = session.timers.find((x) => x.id === timerId)!;
    expect(t).toMatchObject({
      stepId: session.steps[0].id,
      status: "running",
      durationSeconds: 600,
      label: "10-minute timer",
      endsAt: T0 + 600_000,
    });
    expect(remainingMs(t, T0 + 60_000)).toBe(540_000);
    // Survives a reload through the normal session schema.
    const view = resolveSession(JSON.parse(JSON.stringify(session)), {}, T0 + 1000);
    expect(view.kind).toBe("cooking");
  });

  it("starts the step's own timer instead of duplicating it", () => {
    const { session, timerId, reused } = addSessionTimer(at(start(), 1), 600, T0);
    expect(reused).toBe(true);
    expect(timerId).toBe(RECIPE_TIMER);
    expect(session.timers).toHaveLength(start().timers.length);
    expect(session.timers.find((t) => t.id === RECIPE_TIMER)?.status).toBe("running");
  });

  it("adds a separate timer when the step's own timer is a different length or already running", () => {
    const s = at(start(), 1);
    expect(addSessionTimer(s, 300, T0).reused).toBe(false);
    const running = applySessionTimer(s, RECIPE_TIMER, "start", T0);
    expect(addSessionTimer(running, 600, T0).reused).toBe(false);
  });

  it("gives timers added in the same millisecond distinct ids", () => {
    const a = addSessionTimer(start(), 60, T0);
    const b = addSessionTimer(a.session, 60, T0);
    expect(a.timerId).not.toBe(b.timerId);
  });

  it("refuses on finished sessions and past the limit", () => {
    const done = transitionSession(start(), "abandon", T0);
    expect(() => addSessionTimer(done, 60, T0)).toThrow(TimerError);
    let s = start();
    for (let i = 0; i < MAX_EXTRA_TIMERS; i++) s = addSessionTimer(s, 60, T0 + i).session;
    expect(() => addSessionTimer(s, 60, T0)).toThrow(/extra timers/);
  });

  it("works while the session is paused (the pot doesn't pause)", () => {
    const paused = transitionSession(start(), "pause", T0);
    expect(addSessionTimer(paused, 60, T0).session.timers.at(-1)?.status).toBe("running");
  });

  it("must be stopped before finishing, like recipe timers", () => {
    let s = at(start(), 2);
    s = { ...s, completedStepIds: s.steps.slice(0, 2).map((x) => x.id) };
    s = addSessionTimer(s, 60, T0).session;
    expect(checkFinish(s, T0 + 1000).kind).toBe("timers-running");
  });

  it("labels durations plainly", () => {
    expect(extraTimerLabel(600)).toBe("10-minute timer");
    expect(extraTimerLabel(3600)).toBe("1-hour timer");
    expect(extraTimerLabel(45)).toBe("45-second timer");
    expect(extraTimerLabel(5400)).toBe("1 hr 30 min timer");
  });
});

describe("stepTimerFor", () => {
  it("shows the recipe's own timer when the step has one", () => {
    const s = addSessionTimer(at(start(), 1), 120, T0).session;
    expect(stepTimerFor(s, s.steps[1].id)?.id).toBe(RECIPE_TIMER);
  });

  it("shows the newest live extra timer on a step without one", () => {
    const a = addSessionTimer(start(), 60, T0);
    const b = addSessionTimer(a.session, 120, T0 + 1);
    expect(stepTimerFor(b.session, b.session.steps[0].id)?.id).toBe(b.timerId);
  });

  it("hides extra timers once they're cancelled or seen", () => {
    const a = addSessionTimer(start(), 60, T0);
    const cancelled = applySessionTimer(a.session, a.timerId, "cancel", T0 + 1);
    expect(stepTimerFor(cancelled, cancelled.steps[0].id)).toBeNull();
    expect(stepTimerFor(start(), start().steps[0].id)).toBeNull();
  });
});
