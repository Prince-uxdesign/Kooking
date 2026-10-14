import { describe, expect, it } from "vitest";
import { recipeSchema } from "./recipe-schema";
import { remainingMs } from "./timers";
import {
  applySessionTimer,
  rehydrateSession,
  sessionFreshness,
  startSession,
  transitionSession,
} from "./session";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe = recipeSchema.parse(seedJson);
const NOW = 1_700_000_000_000;
const names = new Map([
  ["demo-rice", "Long-grain rice"],
  ["demo-tomato-paste", "Tomato paste"],
  ["demo-salt", "Salt"],
  ["demo-plantain", "Plantain"],
]);

const start = () => startSession({ id: "s1", recipe, servings: 4, now: NOW, lineNames: names });

describe("startSession", () => {
  it("freezes servings, snapshot, and step timers", () => {
    const session = start();
    expect(session.servings).toBe(4);
    expect(session.status).toBe("active");
    expect(session.currentStepIndex).toBe(0);
    expect(session.snapshot.find((l) => l.lineId === "demo-rice")!.scaledQuantity).toBe(400);
    expect(session.timers).toHaveLength(1);
    expect(session.timers[0]).toMatchObject({
      durationSeconds: 600,
      status: "idle",
      remainingMs: 600_000,
      label: "Simmer base",
    });
  });
});

describe("transitions", () => {
  it("walks the active/paused/completed lifecycle", () => {
    const paused = transitionSession(start(), "pause", NOW + 1);
    expect(paused.status).toBe("paused");
    const resumed = transitionSession(paused, "resume", NOW + 2);
    expect(resumed.status).toBe("active");
    const advanced = transitionSession(resumed, "advance", NOW + 3);
    expect(advanced.currentStepIndex).toBe(1);
    const done = transitionSession(advanced, "complete", NOW + 4);
    expect(done.status).toBe("completed");
  });

  it("rejects illegal transitions", () => {
    const done = transitionSession(start(), "complete", NOW + 1);
    expect(() => transitionSession(done, "advance", NOW + 2)).toThrow(/cannot advance/);
    expect(() => transitionSession(done, "resume", NOW + 2)).toThrow();
  });
});

describe("timers", () => {
  it("tracks remaining time across pause with explicit clocks", () => {
    const running = applySessionTimer(start(), "timer:demo-step-2", "start", NOW);
    const timer = running.timers[0];
    expect(timer.status).toBe("running");
    expect(timer.endsAt).toBe(NOW + 600_000);

    const paused = applySessionTimer(running, "timer:demo-step-2", "pause", NOW + 60_000);
    expect(paused.timers[0]).toMatchObject({ status: "paused", remainingMs: 540_000 });
  });
});

describe("rehydrateSession", () => {
  it("completes timers that elapsed while away", () => {
    const running = applySessionTimer(start(), "timer:demo-step-2", "start", NOW);
    const back = rehydrateSession(running, NOW + 700_000);
    expect(back.timers[0]).toMatchObject({
      status: "done",
      remainingMs: 0,
      finishedAt: NOW + 600_000,
    });
  });

  it("recomputes remaining for timers still running", () => {
    const running = applySessionTimer(start(), "timer:demo-step-2", "start", NOW);
    const back = rehydrateSession(running, NOW + 60_000);
    expect(back.timers[0]).toMatchObject({ status: "running", endsAt: NOW + 600_000 });
    expect(remainingMs(back.timers[0], NOW + 60_000)).toBe(540_000);
  });

  it("rejects corrupt payloads instead of half-loading", () => {
    expect(() => rehydrateSession({ id: "x" }, NOW)).toThrow();
    expect(() => rehydrateSession({ ...start(), status: "flying" }, NOW)).toThrow();
  });
});

describe("sessionFreshness", () => {
  it("detects republished recipes without mutating the session", () => {
    const session = start();
    expect(sessionFreshness(session, 1)).toBe("fresh");
    expect(sessionFreshness(session, 2)).toBe("stale-content");
    expect(session.contentVersion).toBe(1);
  });
});
