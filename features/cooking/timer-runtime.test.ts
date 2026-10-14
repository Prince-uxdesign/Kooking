import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTimerAction, createTimer, remainingMs, settleTimers } from "@/shared/domain/timers";
import {
  createChime,
  notificationState,
  notifyTimerDone,
  requestNotifications,
  setSoundPreference,
  soundPreference,
  vibrate,
} from "./timer-alerts";
import { createTimerClock } from "./timer-clock";

const T0 = 1_800_000_000_000;

describe("createTimerClock", () => {
  it("advances with the monotonic source, ignoring wall-clock jumps while visible", () => {
    let wall = T0;
    let mono = 1_000;
    const clock = createTimerClock(
      () => wall,
      () => mono,
    );
    mono += 5_000;
    wall = T0 - 3_600_000; // user moved the clock back an hour
    expect(clock.now()).toBe(T0 + 5_000);
  });

  it("re-anchors to the wall clock on resync (page visible again)", () => {
    let wall = T0;
    let mono = 0;
    const clock = createTimerClock(
      () => wall,
      () => mono,
    );
    // Device slept 25 minutes: monotonic time may not advance, wall does.
    wall += 25 * 60_000;
    clock.resync();
    expect(clock.now()).toBe(T0 + 25 * 60_000);
    mono += 1_000;
    expect(clock.now()).toBe(T0 + 25 * 60_000 + 1_000);
  });

  it("catches a timer that expired while the tab was in the background", () => {
    let wall = T0;
    const mono = 0;
    const clock = createTimerClock(
      () => wall,
      () => mono,
    );
    const running = applyTimerAction(
      createTimer({ id: "t", stepId: "s", durationSeconds: 300 }),
      "start",
      clock.now(),
    );
    // Hidden for 8 minutes; intervals didn't run, monotonic time froze.
    wall += 8 * 60_000;
    expect(settleTimers([running], clock.now()).finished).toEqual([]);
    clock.resync(); // visibilitychange → visible
    const { timers, finished } = settleTimers([running], clock.now());
    expect(finished).toEqual(["t"]);
    expect(timers[0].finishedAt).toBe(T0 + 300_000);
    expect(remainingMs(timers[0], clock.now())).toBe(0);
  });

  it("works with vitest fake timers end to end", () => {
    vi.useFakeTimers({ now: T0 });
    try {
      const clock = createTimerClock(
        () => Date.now(),
        () => Date.now(),
      );
      const t = applyTimerAction(
        createTimer({ id: "t", stepId: "s", durationSeconds: 60 }),
        "start",
        clock.now(),
      );
      vi.advanceTimersByTime(59_000);
      expect(remainingMs(t, clock.now())).toBe(1_000);
      vi.advanceTimersByTime(1_000);
      expect(settleTimers([t], clock.now()).finished).toEqual(["t"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("alerts", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    vi.unstubAllGlobals();
  });

  function installNotification(permission: "default" | "granted" | "denied", answer = permission) {
    const ctor = vi.fn();
    const N = Object.assign(ctor, {
      permission,
      requestPermission: vi.fn(async () => answer),
    });
    (globalThis as { window?: unknown }).window = { Notification: N };
    return N;
  }

  it("reports unsupported when the browser has no Notification API", async () => {
    (globalThis as { window?: unknown }).window = {};
    expect(notificationState()).toBe("unsupported");
    expect(await requestNotifications()).toBe("unsupported");
    expect(notifyTimerDone("Simmer", true)).toBe(false);
  });

  it("does nothing when permission is denied", async () => {
    const N = installNotification("denied");
    expect(notificationState()).toBe("denied");
    expect(await requestNotifications()).toBe("denied");
    expect(notifyTimerDone("Simmer", true)).toBe(false);
    expect(N).not.toHaveBeenCalled();
  });

  it("notifies only when granted and the page is hidden", () => {
    const N = installNotification("granted");
    expect(notifyTimerDone("Simmer", false)).toBe(false);
    expect(notifyTimerDone("Simmer", true)).toBe(true);
    expect(N).toHaveBeenCalledTimes(1);
  });

  it("survives browsers that only allow notifications from a service worker", () => {
    const N = installNotification("granted");
    N.mockImplementation(() => {
      throw new TypeError("Illegal constructor");
    });
    expect(notifyTimerDone("Simmer", true)).toBe(false);
  });

  it("reports when vibration is unavailable", () => {
    vi.stubGlobal("navigator", {});
    expect(vibrate()).toBe(false);
  });

  it("handles audio being unavailable", () => {
    const chime = createChime(() => null);
    expect(chime.available()).toBe(false);
    chime.unlock();
    expect(chime.play()).toBe(false);
  });

  it("doesn't play while audio is still locked by the browser", () => {
    const ctx = { state: "suspended", resume: vi.fn(async () => undefined) };
    const chime = createChime(() => ctx as never);
    expect(chime.play()).toBe(false);
    chime.unlock();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("plays when audio is unlocked", () => {
    const node = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      type: "",
      frequency: { value: 0 },
    };
    const gain = {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    };
    const ctx = {
      state: "running",
      currentTime: 0,
      destination: {},
      resume: vi.fn(async () => undefined),
      createOscillator: () => node,
      createGain: () => gain,
    };
    expect(createChime(() => ctx as never).play()).toBe(true);
    expect(node.start).toHaveBeenCalledTimes(3);
  });

  it("remembers the sound preference, defaulting to on", () => {
    const store = new Map<string, string>();
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    };
    expect(soundPreference()).toBe(true);
    setSoundPreference(false);
    expect(soundPreference()).toBe(false);
  });

  it("falls back to sound on when storage is blocked", () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    };
    expect(soundPreference()).toBe(true);
    expect(() => setSoundPreference(false)).not.toThrow();
  });
});
