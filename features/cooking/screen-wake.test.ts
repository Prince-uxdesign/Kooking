import { afterEach, describe, expect, it, vi } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { recipeSchema } from "@/shared/domain/recipe-schema";
import {
  applySessionTimer,
  startSession,
  transitionSession,
  type CookingSession,
} from "@/shared/domain/session";
import { finishCooking, resolveSession } from "@/shared/domain/cooking-session";
import { remainingMs } from "@/shared/domain/timers";
import {
  MAX_ATTEMPTS,
  createScreenWake,
  screenWakePreference,
  setScreenWakePreference,
  shouldHoldWakeLock,
  wakeLockApi,
  type SentinelLike,
} from "./screen-wake";
import { wakeNote, type ScreenWakeControlProps } from "./ScreenWake";

/* A scripted Screen Wake Lock API. Requests stay pending until settled. */

class FakeSentinel implements SentinelLike {
  released = false;
  private listeners = new Set<() => void>();
  release = vi.fn(async () => {
    if (this.released) return;
    this.released = true;
    this.listeners.forEach((l) => l());
  });
  addEventListener(_: "release", l: () => void) {
    this.listeners.add(l);
  }
  /** The browser/OS drops the lock (tab hidden, battery saver). */
  systemRelease() {
    this.released = true;
    this.listeners.forEach((l) => l());
  }
}

function setup(opts: { visible?: boolean; immediate?: boolean } = {}) {
  const pending: Array<{
    resolve: (s: FakeSentinel) => void;
    reject: (e: unknown) => void;
  }> = [];
  const sentinels: FakeSentinel[] = [];
  const api = {
    request: vi.fn((type: "screen") => {
      expect(type).toBe("screen");
      return new Promise<FakeSentinel>((resolve, reject) => {
        pending.push({
          resolve: (s) => {
            sentinels.push(s);
            resolve(s);
          },
          reject,
        });
      });
    }),
  };
  const env = { visible: opts.visible ?? true };
  const wake = createScreenWake(api, { isVisible: () => env.visible });
  const states: string[] = [];
  wake.subscribe((s) => states.push(s.status));
  const settle = async (i = pending.length - 1) => {
    pending[i].resolve(new FakeSentinel());
    await Promise.resolve();
    await Promise.resolve();
  };
  const refuse = async (name = "NotAllowedError", i = pending.length - 1) => {
    pending[i].reject(Object.assign(new Error("no"), { name }));
    await Promise.resolve();
    await Promise.resolve();
  };
  return { wake, api, pending, sentinels, env, states, settle, refuse };
}

describe("support", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is unsupported without the API and every call is a safe no-op", () => {
    const wake = createScreenWake(null);
    expect(wake.getState().status).toBe("unsupported");
    wake.setWanted(true);
    wake.pageVisibilityChanged();
    wake.retry();
    wake.dispose();
    expect(wake.getState().status).toBe("unsupported");
  });

  it("detects navigator.wakeLock by feature", () => {
    expect(wakeLockApi()).toBeNull(); // node: no navigator.wakeLock
    vi.stubGlobal("navigator", {});
    expect(wakeLockApi()).toBeNull();
    vi.stubGlobal("navigator", { wakeLock: {} });
    expect(wakeLockApi()).toBeNull();
    const wakeLock = { request: vi.fn() };
    vi.stubGlobal("navigator", { wakeLock });
    expect(wakeLockApi()).toBe(wakeLock);
  });

  it("starts off and requests nothing until wanted", () => {
    const { wake, api } = setup();
    expect(wake.getState().status).toBe("off");
    expect(api.request).not.toHaveBeenCalled();
  });
});

describe("acquiring", () => {
  it("requests a screen lock once and reports on", async () => {
    const { wake, api, settle } = setup();
    wake.setWanted(true);
    expect(wake.getState().status).toBe("requesting");
    await settle();
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(api.request).toHaveBeenCalledWith("screen");
    expect(wake.getState()).toMatchObject({ status: "on", recovered: false });
  });

  it("never sends duplicate requests (repeat wants, visibility pings, mounts)", async () => {
    const { wake, api, settle } = setup();
    wake.setWanted(true);
    wake.setWanted(true);
    wake.pageVisibilityChanged();
    wake.retry();
    expect(api.request).toHaveBeenCalledTimes(1);
    await settle();
    wake.setWanted(true);
    wake.pageVisibilityChanged();
    wake.retry();
    expect(api.request).toHaveBeenCalledTimes(1);
  });

  it("doesn't request while the page is hidden; asks when it's shown", async () => {
    const { wake, api, env, settle } = setup({ visible: false });
    wake.setWanted(true);
    expect(api.request).not.toHaveBeenCalled();
    expect(wake.getState().status).toBe("unavailable");
    env.visible = true;
    wake.pageVisibilityChanged();
    await settle();
    expect(wake.getState().status).toBe("on");
  });
});

describe("failures", () => {
  it("shows a plain message and keeps working when the request is refused", async () => {
    const { wake, refuse } = setup();
    wake.setWanted(true);
    await refuse();
    expect(wake.getState().status).toBe("unavailable");
    expect(wake.getState().message).toMatch(/Battery saver/);
  });

  it("handles a request that throws synchronously", () => {
    const wake = createScreenWake(
      {
        request: () => {
          throw new Error("sandboxed");
        },
      },
      { isVisible: () => true },
    );
    wake.setWanted(true);
    expect(wake.getState().status).toBe("unavailable");
  });

  it("treats a policy block as final: no automatic retry, only the cook's retry", async () => {
    const { wake, api, refuse } = setup();
    wake.setWanted(true);
    await refuse("SecurityError");
    expect(wake.getState().message).toMatch(/isn't allowed/);
    expect(api.request).toHaveBeenCalledTimes(1);
  });

  it("makes no timer-driven retries (nothing happens by itself)", async () => {
    vi.useFakeTimers();
    try {
      const { wake, api, refuse } = setup();
      wake.setWanted(true);
      await refuse();
      vi.advanceTimersByTime(10 * 60_000);
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(wake.getState().status).toBe("unavailable");
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries only when the cook asks, and succeeds", async () => {
    const { wake, api, refuse, settle } = setup();
    wake.setWanted(true);
    await refuse();
    wake.retry();
    expect(api.request).toHaveBeenCalledTimes(2);
    await settle();
    expect(wake.getState()).toMatchObject({ status: "on", recovered: true });
  });
});

describe("losing and regaining the lock", () => {
  it("hidden page: lets go of the reference, reacquires when visible again", async () => {
    const { wake, api, env, sentinels, settle } = setup();
    wake.setWanted(true);
    await settle();
    env.visible = false;
    wake.pageVisibilityChanged();
    expect(sentinels[0].release).toHaveBeenCalled();
    expect(wake.getState().status).toBe("unavailable");
    expect(api.request).toHaveBeenCalledTimes(1);
    env.visible = true;
    wake.pageVisibilityChanged();
    await settle();
    expect(api.request).toHaveBeenCalledTimes(2);
    expect(wake.getState()).toMatchObject({ status: "on", recovered: true });
  });

  it("system release while visible: asks again, then stops after a few in a row", async () => {
    const { wake, api, sentinels, settle } = setup();
    wake.setWanted(true);
    await settle();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      sentinels.at(-1)!.systemRelease();
      await settle();
    }
    expect(api.request).toHaveBeenCalledTimes(1 + MAX_ATTEMPTS);
    sentinels.at(-1)!.systemRelease();
    expect(api.request).toHaveBeenCalledTimes(1 + MAX_ATTEMPTS); // gave up, no loop
    expect(wake.getState()).toMatchObject({ status: "unavailable" });
    expect(wake.getState().message).toMatch(/Battery saver/);
    // A fresh page-visible event is allowed one new attempt.
    wake.pageVisibilityChanged();
    expect(api.request).toHaveBeenCalledTimes(2 + MAX_ATTEMPTS);
  });

  it("doesn't treat its own release as a loss", async () => {
    const { wake, api, settle } = setup();
    wake.setWanted(true);
    await settle();
    wake.setWanted(false);
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(wake.getState().status).toBe("off");
  });
});

describe("releasing", () => {
  it("setWanted(false) releases the lock", async () => {
    const { wake, sentinels, settle } = setup();
    wake.setWanted(true);
    await settle();
    wake.setWanted(false);
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
    expect(wake.getState().status).toBe("off");
  });

  it("dispose (unmount / navigation) releases and goes quiet", async () => {
    const { wake, api, sentinels, states, settle } = setup();
    wake.setWanted(true);
    await settle();
    const seen = states.length;
    wake.dispose();
    expect(sentinels[0].release).toHaveBeenCalled();
    sentinels[0].systemRelease();
    wake.setWanted(true);
    wake.pageVisibilityChanged();
    wake.retry();
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(states.length).toBe(seen);
  });

  it("a request that resolves after unmount releases itself (no leaked lock)", async () => {
    const { wake, sentinels, settle } = setup();
    wake.setWanted(true);
    wake.dispose();
    await settle();
    expect(sentinels[0].release).toHaveBeenCalled();
    expect(wake.getState().status).not.toBe("on");
  });

  it("a request that resolves after the cook turned it off releases itself", async () => {
    const { wake, sentinels, settle } = setup();
    wake.setWanted(true);
    wake.setWanted(false);
    await settle();
    expect(sentinels[0].release).toHaveBeenCalled();
    expect(wake.getState().status).toBe("off");
  });

  it("off then on again while a request is pending keeps only one lock", async () => {
    const { wake, api, sentinels, settle } = setup();
    wake.setWanted(true); // request 0
    wake.setWanted(false);
    wake.setWanted(true); // request 1
    expect(api.request).toHaveBeenCalledTimes(2);
    await settle(0); // stale: released
    expect(sentinels[0].release).toHaveBeenCalled();
    expect(wake.getState().status).toBe("requesting");
    await settle(1);
    expect(wake.getState().status).toBe("on");
    expect(sentinels[1].released).toBe(false);
  });
});

describe("when Cooking Mode should hold it", () => {
  it("only for an active session with the preference on", () => {
    const hold = (
      preference: boolean | null,
      s: Parameters<typeof shouldHoldWakeLock>[0]["sessionStatus"],
    ) => shouldHoldWakeLock({ preference, sessionStatus: s });
    expect(hold(true, "active")).toBe(true);
    expect(hold(true, "paused")).toBe(false);
    expect(hold(true, "completed")).toBe(false);
    expect(hold(true, "abandoned")).toBe(false);
    expect(hold(true, null)).toBe(false); // loading, not found, left
    expect(hold(false, "active")).toBe(false);
    expect(hold(null, "active")).toBe(false); // preference not read yet
  });
});

describe("session lifecycle and timers", () => {
  const recipe = recipeSchema.parse(seedJson);
  const T0 = 1_800_000_000_000;
  const fresh = (): CookingSession =>
    startSession({ id: "s", recipe, servings: 4, now: T0, lineNames: new Map() });
  const holds = (s: CookingSession) =>
    shouldHoldWakeLock({ preference: true, sessionStatus: s.status });

  it("follows pause, resume, finish and end", () => {
    const active = fresh();
    expect(holds(active)).toBe(true);
    const paused = transitionSession(active, "pause", T0 + 1);
    expect(holds(paused)).toBe(false);
    expect(holds(transitionSession(paused, "resume", T0 + 2))).toBe(true);
    const done = finishCooking(
      {
        ...active,
        completedStepIds: active.steps.slice(0, -1).map((s) => s.id),
        currentStepIndex: 2,
      },
      T0 + 3,
    );
    expect(holds(done)).toBe(false);
    expect(holds(transitionSession(active, "abandon", T0 + 4))).toBe(false);
  });

  it("a recovered session gets a lock only per preference, from a fresh controller", async () => {
    const stored = JSON.parse(
      JSON.stringify(applySessionTimer(fresh(), "timer:demo-step-2", "start", T0)),
    );
    const view = resolveSession(stored, {}, T0 + 60_000);
    expect(view.kind).toBe("cooking");
    const status = view.kind === "cooking" ? view.session.status : null;
    const a = setup();
    // Preference off: nothing is requested after recovery.
    a.wake.setWanted(shouldHoldWakeLock({ preference: false, sessionStatus: status }));
    expect(a.api.request).not.toHaveBeenCalled();
    // Preference on: exactly one new request; no lock is assumed to have survived.
    const b = setup();
    b.wake.setWanted(shouldHoldWakeLock({ preference: true, sessionStatus: status }));
    expect(b.api.request).toHaveBeenCalledTimes(1);
  });

  it("a refused lock leaves timers and the session untouched", async () => {
    const running = applySessionTimer(fresh(), "timer:demo-step-2", "start", T0);
    const before = JSON.stringify(running);
    const { wake, refuse } = setup();
    wake.setWanted(true);
    await refuse();
    expect(JSON.stringify(running)).toBe(before);
    const t = running.timers.find((x) => x.id === "timer:demo-step-2")!;
    expect(remainingMs(t, T0 + 60_000)).toBe(540_000);
    expect(running.timers.find((x) => x.id === "timer:demo-step-2")?.status).toBe("running");
  });
});

describe("preference", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("defaults on, round-trips, and survives missing storage", () => {
    expect(screenWakePreference()).toBe(true); // no window
    expect(() => setScreenWakePreference(false)).not.toThrow();
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    });
    expect(screenWakePreference()).toBe(true);
    setScreenWakePreference(false);
    expect(screenWakePreference()).toBe(false);
    setScreenWakePreference(true);
    expect(screenWakePreference()).toBe(true);
  });
});

describe("control copy", () => {
  const props = (over: Partial<ScreenWakeControlProps>): ScreenWakeControlProps => ({
    state: { status: "on", message: null, recovered: false },
    enabled: true,
    sessionPaused: false,
    onToggle: () => {},
    onRetry: () => {},
    ...over,
  });

  it("says each state in words and never promises more than it can do", () => {
    expect(wakeNote(props({}))?.text).toMatch(/can still override/);
    expect(
      wakeNote(props({ state: { status: "requesting", message: null, recovered: false } }))?.text,
    ).toMatch(/Keeping the screen on/);
    expect(
      wakeNote(props({ state: { status: "on", message: null, recovered: true } }))?.text,
    ).toMatch(/staying on again/);
    expect(wakeNote(props({ sessionPaused: true }))?.text).toMatch(/can sleep/);
    expect(wakeNote(props({ enabled: false }))).toBeNull();
    expect(wakeNote(props({ state: null }))).toBeNull();
  });

  it("offers Try again only when a refusal is worth retrying", () => {
    const refused = wakeNote(
      props({
        state: { status: "unavailable", message: "Couldn't keep the screen on.", recovered: false },
      }),
    );
    expect(refused?.retry).toBe(true);
    const hidden = wakeNote(
      props({ state: { status: "unavailable", message: null, recovered: false } }),
    );
    expect(hidden?.retry).toBe(false);
  });

  it("unsupported explains once and offers no control", () => {
    const n = wakeNote(
      props({ state: { status: "unsupported", message: null, recovered: false } }),
    );
    expect(n?.text).toMatch(/can't keep the screen on/);
    expect(n?.retry).toBe(false);
  });
});
