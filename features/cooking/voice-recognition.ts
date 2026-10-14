/**
 * Microphone listening for Cooking Mode voice commands (Phase 30), on
 * the Web Speech API's SpeechRecognition (or webkitSpeechRecognition).
 *
 * Rules
 * - Feature-detected; never assumed. No API → "unsupported".
 * - Starts only from `start()`, which the UI calls from a button press.
 *   Nothing here runs when Cooking Mode opens.
 * - One recognition session at a time. A second `start()` while one is
 *   starting or running does nothing.
 * - `stop()` aborts immediately (abort, not stop: no last result is
 *   delivered after the cook said stop).
 * - Each result is handed over once, by index. Events from an earlier
 *   session are ignored (generation counter).
 * - Engines end a session after silence. While the cook wants to
 *   listen it restarts, but only for a limited quiet period, after
 *   which listening turns itself off and says so.
 * - Nothing is stored: transcripts go to the callback and are dropped.
 */

export type ListenStatus =
  | "unsupported"
  | "off"
  /** Waiting for the browser (and, the first time, the permission prompt). */
  | "requesting"
  | "listening"
  | "denied"
  | "error";

export interface ListenState {
  status: ListenStatus;
  /** Plain-language reason for "denied", "error", or why listening stopped. */
  message: string | null;
}

interface AlternativeLike {
  transcript: string;
  confidence?: number;
}
interface ResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: AlternativeLike;
}
export interface ResultEventLike {
  resultIndex: number;
  results: { readonly length: number; [index: number]: ResultLike };
}

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: ResultEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type RecognitionCtor = new () => RecognitionLike;

/** The browser's speech recognition constructor, or null when there isn't one. */
export function recognitionApi(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  try {
    const w = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    return typeof Ctor === "function" ? Ctor : null;
  } catch {
    return null;
  }
}

const MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access is blocked. Allow it in your browser's site settings to use voice.",
  "service-not-allowed":
    "This browser won't run voice commands here. Use the buttons on screen instead.",
  "audio-capture": "No microphone was found. Check that one is connected.",
  network: "Voice commands need an internet connection in this browser.",
  "language-not-supported": "Voice commands aren't available for this language here.",
  "bad-grammar": "Voice commands hit a problem. Try again.",
};
const GENERIC = "Voice commands stopped working. Tap the mic to try again.";

/** Turn listening off after this long without a recognized phrase. */
export const QUIET_TIMEOUT_MS = 2 * 60_000;
/** If the browser hasn't started listening in this time, give up. */
export const START_TIMEOUT_MS = 15_000;
/** Restarts allowed in a short window before treating it as a failure loop. */
const MAX_QUICK_RESTARTS = 5;
const QUICK_WINDOW_MS = 10_000;

type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
  now: () => number;
};

export function createVoiceListener(
  Ctor: RecognitionCtor | null,
  options: {
    lang?: string | null;
    /** Final transcripts for one utterance (best guess first). */
    onPhrase: (alternatives: string[]) => void;
    timers?: Timers;
  },
) {
  const timers: Timers = options.timers ?? {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
    now: () => Date.now(),
  };
  let state: ListenState = { status: Ctor ? "off" : "unsupported", message: null };
  const listeners = new Set<(s: ListenState) => void>();
  let rec: RecognitionLike | null = null;
  let generation = 0;
  /** The cook asked to listen and hasn't asked to stop. */
  let wanted = false;
  let quietTimer: unknown = null;
  let startTimer: unknown = null;
  let restarts: number[] = [];
  let disposed = false;

  const set = (next: ListenState) => {
    state = next;
    for (const l of listeners) l(state);
  };

  const clear = (t: unknown) => {
    if (t !== null) timers.clearTimeout(t);
  };

  function teardown() {
    generation++;
    clear(quietTimer);
    clear(startTimer);
    quietTimer = startTimer = null;
    const r = rec;
    rec = null;
    if (r) {
      r.onstart = r.onresult = r.onerror = r.onend = null;
      try {
        r.abort();
      } catch {
        // Already stopped.
      }
    }
  }

  function end(status: "off" | "denied" | "error", message: string | null) {
    wanted = false;
    teardown();
    set({ status, message });
  }

  function armQuietTimer() {
    clear(quietTimer);
    quietTimer = timers.setTimeout(() => {
      quietTimer = null;
      if (wanted) {
        end(
          "off",
          "Stopped listening after 2 minutes without a command. Tap the mic to start again.",
        );
      }
    }, QUIET_TIMEOUT_MS);
  }

  function open() {
    if (!Ctor || !wanted || disposed) return;
    const gen = ++generation;
    let r: RecognitionLike;
    try {
      r = new Ctor();
    } catch {
      end("error", GENERIC);
      return;
    }
    rec = r;
    r.lang = options.lang ?? "";
    r.continuous = true;
    r.interimResults = false;
    r.maxAlternatives = 3;
    const handled = new Set<number>();

    r.onstart = () => {
      if (gen !== generation) return;
      clear(startTimer);
      startTimer = null;
      if (state.status !== "listening") set({ status: "listening", message: null });
    };
    r.onresult = (e) => {
      if (gen !== generation) return;
      for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result?.isFinal || handled.has(i)) continue;
        handled.add(i);
        const alternatives: string[] = [];
        for (let a = 0; a < result.length; a++) {
          const t = result[a]?.transcript?.trim();
          if (t) alternatives.push(t);
        }
        if (alternatives.length > 0) {
          armQuietTimer();
          options.onPhrase(alternatives);
        }
      }
    };
    r.onerror = (e) => {
      if (gen !== generation) return;
      const code = e?.error ?? "";
      // Silence and our own abort aren't failures; `end` decides what's next.
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        end("denied", MESSAGES[code]);
        return;
      }
      end("error", MESSAGES[code] ?? GENERIC);
    };
    r.onend = () => {
      if (gen !== generation) return;
      rec = null;
      if (!wanted) {
        set({ status: "off", message: null });
        return;
      }
      // The engine stopped on its own (silence, its own time limit).
      const now = timers.now();
      restarts = restarts.filter((t) => now - t < QUICK_WINDOW_MS);
      restarts.push(now);
      if (restarts.length > MAX_QUICK_RESTARTS) {
        end("error", GENERIC);
        return;
      }
      open();
    };

    startTimer = timers.setTimeout(() => {
      startTimer = null;
      if (gen === generation && state.status === "requesting") {
        end("error", "The microphone didn't start. Tap the mic to try again.");
      }
    }, START_TIMEOUT_MS);

    try {
      r.start();
    } catch {
      // InvalidStateError: something is already running in this page.
      end("error", GENERIC);
    }
  }

  const listener = {
    getState: () => state,

    subscribe(fn: (s: ListenState) => void): () => void {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    /** Call only from a button the cook pressed. */
    start(): void {
      if (!Ctor || disposed) return;
      if (state.status === "requesting" || state.status === "listening") return;
      wanted = true;
      restarts = [];
      set({ status: "requesting", message: null });
      armQuietTimer();
      open();
    },

    /** Stop now: the microphone is released and later results are ignored. */
    stop(message: string | null = null): void {
      if (!Ctor) return;
      if (!wanted && !rec && state.status !== "requesting" && state.status !== "listening") return;
      end("off", message);
    },

    dispose(): void {
      listeners.clear();
      wanted = false;
      teardown();
      disposed = true;
    },
  };
  return listener;
}

export type VoiceListener = ReturnType<typeof createVoiceListener>;

/**
 * Drops the same command heard twice in quick succession (engines can
 * repeat a final result, and a cook may say it again while the first is
 * being handled), so "next step" can never move two steps.
 */
export function createDeduper(windowMs = 2_500, now: () => number = () => Date.now()) {
  let last: { key: string; at: number } | null = null;
  return (key: string): boolean => {
    const t = now();
    if (last && last.key === key && t - last.at < windowMs) return false;
    last = { key, at: t };
    return true;
  };
}
