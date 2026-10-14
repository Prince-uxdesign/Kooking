/**
 * Ways to tell the cook a timer finished. Every channel is best-effort
 * and fails quietly; the on-screen "time's up" state is always shown
 * regardless, so nothing depends on sound or notifications working.
 */

export type NotificationState = "unsupported" | "default" | "granted" | "denied";

type NotificationLike = {
  permission: "default" | "granted" | "denied";
  requestPermission: () => Promise<"default" | "granted" | "denied">;
  new (title: string, options?: { body?: string; tag?: string }): unknown;
};

function notificationApi(): NotificationLike | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return (window as unknown as { Notification: NotificationLike }).Notification;
}

export function notificationState(): NotificationState {
  const api = notificationApi();
  return api ? api.permission : "unsupported";
}

/** Only call from a button the cook pressed to turn alerts on. */
export async function requestNotifications(): Promise<NotificationState> {
  const api = notificationApi();
  if (!api) return "unsupported";
  try {
    return await api.requestPermission();
  } catch {
    return api.permission;
  }
}

/**
 * System notification, only when permission is granted and the page is
 * hidden (when visible, the in-app alert is enough). Some mobile
 * browsers only allow notifications from a service worker; there the
 * constructor throws and we fall back to the in-app alert.
 */
export function notifyTimerDone(label: string, hidden: boolean): boolean {
  const api = notificationApi();
  if (!api || api.permission !== "granted" || !hidden) return false;
  try {
    new api(`${label}: time's up`, {
      body: "Check your pot. The timer is a guide; follow the recipe's cue for doneness.",
      tag: `kooking-timer-${label}`,
    });
    return true;
  } catch {
    return false;
  }
}

export function vibrate(): boolean {
  try {
    return typeof navigator !== "undefined" && "vibrate" in navigator
      ? navigator.vibrate([300, 150, 300])
      : false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Sound                                                              */
/* ------------------------------------------------------------------ */

const SOUND_KEY = "kooking:timer-sound:v1";

/** Per-device preference; defaults to on. */
export function soundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundPreference(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Preference just won't persist.
  }
}

type AudioCtx = {
  state: string;
  currentTime: number;
  destination: unknown;
  resume: () => Promise<void>;
  createOscillator: () => {
    type: string;
    frequency: { value: number };
    connect: (n: unknown) => void;
    start: (t: number) => void;
    stop: (t: number) => void;
  };
  createGain: () => {
    gain: {
      setValueAtTime: (v: number, t: number) => void;
      exponentialRampToValueAtTime: (v: number, t: number) => void;
    };
    connect: (n: unknown) => void;
  };
};

/**
 * A short generated chime (no audio file). Browsers only allow audio
 * after a user gesture, so `unlock()` is called from the Start/Resume
 * press; if audio is unavailable or still locked, `play()` returns false.
 */
export function createChime(
  factory: () => AudioCtx | null = () => {
    if (typeof window === "undefined") return null;
    const Ctor =
      (window as unknown as { AudioContext?: new () => AudioCtx }).AudioContext ??
      (window as unknown as { webkitAudioContext?: new () => AudioCtx }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  },
) {
  let ctx: AudioCtx | null = null;
  return {
    available(): boolean {
      try {
        ctx ??= factory();
      } catch {
        ctx = null;
      }
      return ctx !== null;
    },
    unlock(): void {
      if (!this.available()) return;
      ctx!.resume().catch(() => undefined);
    },
    play(): boolean {
      if (!this.available() || ctx!.state !== "running") return false;
      try {
        const start = ctx!.currentTime;
        for (let i = 0; i < 3; i++) {
          const osc = ctx!.createOscillator();
          const gain = ctx!.createGain();
          osc.type = "sine";
          osc.frequency.value = 880;
          const t = start + i * 0.45;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx!.destination);
          osc.start(t);
          osc.stop(t + 0.4);
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type Chime = ReturnType<typeof createChime>;
