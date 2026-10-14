/**
 * Screen wake for Cooking Mode (Phase 31), on the Screen Wake Lock API.
 * Best-effort: the browser, battery saver or device settings can always
 * override it, and nothing else in Cooking Mode depends on it.
 *
 * Rules
 * - Feature-detected; no API → "unsupported" and every call is a no-op.
 * - Held only while `setWanted(true)`: the cook wants it AND the session
 *   is actively being cooked. Never requested outside Cooking Mode.
 * - One request at a time, one lock at a time. Results from an older
 *   request (cancelled, unmounted, superseded) release themselves.
 * - The browser drops the lock whenever the page is hidden, so we let go
 *   of our reference then and ask again when the page is visible. No
 *   stale references are kept.
 * - No retry timers and no keep-alive tricks. A new attempt happens only
 *   on an event: the page becoming visible again, or the cook pressing
 *   Try again. Repeated refusals or system releases stop after a few.
 */

export type WakeStatus = "unsupported" | "off" | "requesting" | "on" | "unavailable";

export interface WakeState {
  status: WakeStatus;
  /** Plain-language reason, for "unavailable" when it's worth showing. */
  message: string | null;
  /** The lock came back after being lost (shown once, then cleared). */
  recovered: boolean;
}

export interface SentinelLike {
  readonly released?: boolean;
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
  removeEventListener?(type: "release", listener: () => void): void;
}

export interface WakeLockApi {
  request(type: "screen"): Promise<SentinelLike>;
}

/** The browser's wake lock API, or null when it isn't there (or the context is insecure). */
export function wakeLockApi(): WakeLockApi | null {
  if (typeof navigator === "undefined") return null;
  try {
    const wl = (navigator as unknown as { wakeLock?: WakeLockApi }).wakeLock;
    return wl && typeof wl.request === "function" ? wl : null;
  } catch {
    return null;
  }
}

/** Attempts in a row (without a page-visibility or user event) before giving up quietly. */
export const MAX_ATTEMPTS = 3;

const REFUSED = "Couldn't keep the screen on. Battery saver or device settings may be blocking it.";
const BLOCKED = "This page isn't allowed to keep the screen on.";

/** Whether Cooking Mode should be holding a lock right now. */
export function shouldHoldWakeLock(args: {
  preference: boolean | null;
  sessionStatus: "active" | "paused" | "completed" | "abandoned" | null;
}): boolean {
  return args.preference === true && args.sessionStatus === "active";
}

export function createScreenWake(
  api: WakeLockApi | null,
  options: { isVisible?: () => boolean } = {},
) {
  const isVisible =
    options.isVisible ??
    (() => typeof document === "undefined" || document.visibilityState !== "hidden");
  let state: WakeState = {
    status: api ? "off" : "unsupported",
    message: null,
    recovered: false,
  };
  const listeners = new Set<(s: WakeState) => void>();
  let wanted = false;
  let sentinel: SentinelLike | null = null;
  /** Bumped whenever an in-flight request stops being relevant. */
  let generation = 0;
  let inflight: number | null = null;
  let systemReleases = 0;
  let lostBefore = false;
  let disposed = false;

  const set = (next: Partial<WakeState> & { status: WakeStatus }) => {
    state = { message: null, recovered: false, ...next };
    for (const l of listeners) l(state);
  };

  function dropLock() {
    generation++;
    const s = sentinel;
    sentinel = null;
    if (!s) return;
    try {
      void s.release().catch(() => undefined);
    } catch {
      // Already released.
    }
  }

  function acquire() {
    if (!api || !wanted || disposed || sentinel || inflight === generation) return;
    if (!isVisible()) {
      set({ status: "unavailable" });
      return;
    }
    const gen = generation;
    inflight = gen;
    set({ status: "requesting" });

    const settle = (s: SentinelLike | null, error?: unknown) => {
      if (inflight === gen) inflight = null;
      if (gen !== generation || !wanted || disposed) {
        // Superseded while waiting: don't keep a lock nobody asked for.
        try {
          void s?.release().catch(() => undefined);
        } catch {
          // Nothing to release.
        }
        return;
      }
      if (s) {
        sentinel = s;
        const onRelease = () => {
          if (sentinel !== s) return; // our own release, or a stale one
          sentinel = null;
          if (!wanted || disposed) return;
          lostBefore = true;
          if (!isVisible()) {
            set({ status: "unavailable" });
            return;
          }
          systemReleases++;
          if (systemReleases > MAX_ATTEMPTS) {
            set({ status: "unavailable", message: REFUSED });
            return;
          }
          acquire();
        };
        s.addEventListener("release", onRelease);
        set({ status: "on", recovered: lostBefore });
        lostBefore = false;
        return;
      }
      const name = (error as { name?: string } | null)?.name;
      lostBefore = true;
      set({
        status: "unavailable",
        message: name === "SecurityError" ? BLOCKED : REFUSED,
      });
    };

    try {
      api.request("screen").then(
        (s) => settle(s),
        (e) => settle(null, e),
      );
    } catch (e) {
      settle(null, e);
    }
  }

  return {
    getState: () => state,

    subscribe(fn: (s: WakeState) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Hold the lock (true) or release it (false). Safe to call repeatedly. */
    setWanted(next: boolean): void {
      if (!api || disposed || next === wanted) return;
      wanted = next;
      systemReleases = 0;
      if (next) {
        acquire();
      } else {
        dropLock();
        lostBefore = false;
        set({ status: "off" });
      }
    },

    /** Call on visibilitychange / pageshow / pagehide. */
    pageVisibilityChanged(): void {
      if (!api || disposed || !wanted) return;
      if (!isVisible()) {
        // The browser releases it anyway; let go of our reference now.
        if (sentinel || inflight === generation) lostBefore = true;
        dropLock();
        set({ status: "unavailable" });
        return;
      }
      // Coming back is a user-driven event, so it gets a fresh budget.
      systemReleases = 0;
      acquire();
    },

    /** The cook pressed Try again. */
    retry(): void {
      if (!api || disposed || !wanted) return;
      systemReleases = 0;
      acquire();
    },

    /** Leaving Cooking Mode: release now and ignore anything that arrives later. */
    dispose(): void {
      listeners.clear();
      wanted = false;
      dropLock();
      disposed = true;
    },
  };
}

export type ScreenWake = ReturnType<typeof createScreenWake>;

/* ------------------------------------------------------------------ */
/* Preference (per device)                                            */
/* ------------------------------------------------------------------ */

const PREF_KEY = "kooking:screen-wake:v1";

/** Defaults to on: keeping the screen awake is the point of Cooking Mode. */
export function screenWakePreference(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setScreenWakePreference(on: boolean): void {
  try {
    window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Preference just won't persist.
  }
}
