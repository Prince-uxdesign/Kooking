/**
 * Read-aloud for Cooking Mode (Phase 29), on the Web Speech API's
 * SpeechSynthesis. Best-effort like the timer alerts: the step is always
 * on screen, so nothing depends on speech working.
 *
 * Rules
 * - Feature-detected; never assumed. No API → "unsupported".
 * - One reading at a time. Pressing Play again for the same step while
 *   it's being read does nothing; a new reading cancels the old one.
 * - Every reading has a generation number. Events from an older reading
 *   (late `end`, `error: interrupted` after cancel) are ignored, so a
 *   previous step can never change the state or keep talking.
 * - Pause is not reliable everywhere (some Android engines cancel
 *   instead). If the paused reading was lost, Resume restarts from the
 *   sentence it was on.
 */

export type ReadAloudStatus =
  "unsupported" | "idle" | "starting" | "playing" | "paused" | "stopped" | "done" | "error";

export interface ReadAloudState {
  status: ReadAloudStatus;
  /** Which reading the status is about (e.g. session + step id). */
  key: string | null;
  /** Plain-language reason, only for "error". */
  message: string | null;
}

export interface VoiceLike {
  voiceURI: string;
  name: string;
  lang: string;
  default?: boolean;
  localService?: boolean;
}

export interface UtteranceLike {
  text: string;
  lang: string;
  voice: VoiceLike | null;
  rate: number;
  onstart: ((e: unknown) => void) | null;
  onend: ((e: unknown) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

export interface SynthLike {
  readonly speaking: boolean;
  readonly paused: boolean;
  readonly pending: boolean;
  speak(u: UtteranceLike): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  getVoices(): VoiceLike[];
  addEventListener?(type: "voiceschanged", cb: () => void): void;
  removeEventListener?(type: "voiceschanged", cb: () => void): void;
}

export interface SpeechApi {
  synth: SynthLike;
  Utterance: new (text: string) => UtteranceLike;
}

/** The browser's speech synthesis, or null when it isn't there. */
export function speechApi(): SpeechApi | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    speechSynthesis?: SynthLike;
    SpeechSynthesisUtterance?: new (text: string) => UtteranceLike;
  };
  try {
    if (!w.speechSynthesis || typeof w.SpeechSynthesisUtterance !== "function") return null;
    return { synth: w.speechSynthesis, Utterance: w.SpeechSynthesisUtterance };
  } catch {
    return null;
  }
}

export interface ReadRequest {
  key: string;
  segments: string[];
  /** BCP 47 tag; ignored when a voice is chosen (the voice carries its own). */
  lang?: string | null;
  voice?: VoiceLike | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Your browser didn't allow speech just now. Tap Read aloud to hear this step.",
  "language-unavailable": "No voice is available for this language. Try the device default voice.",
  "voice-unavailable": "That voice isn't available. Try the device default voice.",
  "audio-busy": "Another app is using the speaker. Try again in a moment.",
  "audio-hardware": "Your device couldn't play speech. Check the volume and try again.",
};
const GENERIC_ERROR = "Couldn't read this step aloud. The step is still on screen.";
const START_TIMEOUT_MS = 5_000;

type Timers = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

export function createReadAloud(
  api: SpeechApi | null,
  timers: Timers = {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
  },
) {
  let state: ReadAloudState = {
    status: api ? "idle" : "unsupported",
    key: null,
    message: null,
  };
  const listeners = new Set<(s: ReadAloudState) => void>();
  let generation = 0;
  let current: ReadRequest | null = null;
  /** Index of the sentence being spoken, for resuming a lost pause. */
  let position = 0;
  /** The engine dropped the paused reading (cancel-on-pause engines). */
  let pauseLost = false;
  /** Strong refs: some engines drop events for garbage-collected utterances. */
  let queue: UtteranceLike[] = [];
  let watchdog: unknown = null;
  let disposed = false;

  const set = (next: Partial<ReadAloudState>) => {
    state = { ...state, message: null, ...next };
    for (const l of listeners) l(state);
  };

  const clearWatchdog = () => {
    if (watchdog !== null) timers.clearTimeout(watchdog);
    watchdog = null;
  };

  const cancelEngine = () => {
    try {
      api?.synth.cancel();
    } catch {
      // Nothing is playing that we can reach.
    }
  };

  function start(request: ReadRequest, from: number) {
    if (!api || disposed) return;
    const gen = ++generation;
    clearWatchdog();
    // Clear anything queued (ours or stale) before speaking, so readings never overlap.
    cancelEngine();
    current = request;
    position = from;
    pauseLost = false;

    const segments = request.segments.slice(from);
    if (segments.length === 0) {
      set({ status: "idle", key: request.key });
      return;
    }

    queue = segments.map((text, i) => {
      const u = new api.Utterance(text);
      if (request.voice) {
        u.voice = request.voice;
        u.lang = request.voice.lang;
      } else if (request.lang) {
        u.lang = request.lang;
      }
      u.onstart = () => {
        if (gen !== generation) return;
        clearWatchdog();
        position = from + i;
        if (state.status === "starting") set({ status: "playing", key: request.key });
      };
      u.onend = () => {
        if (gen !== generation) return;
        if (state.status === "paused") {
          pauseLost = true;
          return;
        }
        if (i === segments.length - 1) {
          clearWatchdog();
          queue = [];
          set({ status: "done", key: request.key });
        }
      };
      u.onerror = (e) => {
        if (gen !== generation) return;
        const code = e?.error ?? "";
        if (code === "interrupted" || code === "canceled") {
          // Not cancelled by us (that bumps the generation): the engine or
          // the OS cut in. While paused, that's a lost pause.
          if (state.status === "paused") pauseLost = true;
          else finish("stopped");
          return;
        }
        finish("error", ERROR_MESSAGES[code] ?? GENERIC_ERROR);
      };
      return u;
    });

    set({ status: "starting", key: request.key });
    watchdog = timers.setTimeout(() => {
      watchdog = null;
      if (gen !== generation || state.status !== "starting") return;
      if (api.synth.speaking && !api.synth.paused) {
        // Speaking, just without a start event (some engines skip it).
        set({ status: "playing", key: request.key });
        return;
      }
      finish("error", GENERIC_ERROR);
    }, START_TIMEOUT_MS);

    try {
      for (const u of queue) api.synth.speak(u);
    } catch {
      finish("error", GENERIC_ERROR);
    }
  }

  function finish(status: "stopped" | "error", message?: string) {
    generation++;
    clearWatchdog();
    cancelEngine();
    queue = [];
    pauseLost = false;
    set({ status, key: current?.key ?? null, ...(message ? { message } : {}) });
  }

  const busyWith = (key: string) =>
    current?.key === key && (state.status === "starting" || state.status === "playing");

  const controller = {
    getState: () => state,

    subscribe(listener: (s: ReadAloudState) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Read a step. A second press for the same step while reading is ignored. */
    play(request: ReadRequest): void {
      if (!api || disposed) return;
      if (busyWith(request.key)) return;
      if (state.status === "paused" && current?.key === request.key) {
        controller.resume();
        return;
      }
      start(request, 0);
    },

    /** Start the step again from the top. */
    replay(request: ReadRequest): void {
      start(request, 0);
    },

    pause(): void {
      if (!api || (state.status !== "playing" && state.status !== "starting")) return;
      clearWatchdog();
      try {
        api.synth.pause();
      } catch {
        pauseLost = true;
      }
      set({ status: "paused", key: current?.key ?? null });
    },

    resume(): void {
      if (!api || state.status !== "paused" || !current) return;
      const engineHasIt = !pauseLost && (api.synth.paused || api.synth.speaking);
      if (!engineHasIt) {
        start(current, position);
        return;
      }
      try {
        api.synth.resume();
        set({ status: "playing", key: current.key });
      } catch {
        start(current, position);
      }
    },

    /** Silence now. Safe to call any time, including when nothing is playing. */
    stop(): void {
      if (!api) return;
      const wasActive =
        state.status === "starting" || state.status === "playing" || state.status === "paused";
      generation++;
      clearWatchdog();
      cancelEngine();
      queue = [];
      pauseLost = false;
      if (wasActive) set({ status: "stopped", key: current?.key ?? null });
    },

    /** Forget the last reading's outcome (e.g. after moving to a new step). */
    reset(): void {
      controller.stop();
      current = null;
      if (state.status !== "unsupported") set({ status: "idle", key: null });
    },

    /** Leaving Cooking Mode: stop talking and ignore anything that arrives later. */
    dispose(): void {
      listeners.clear();
      controller.stop();
      disposed = true;
    },
  };
  return controller;
}

export type ReadAloud = ReturnType<typeof createReadAloud>;

/* ------------------------------------------------------------------ */
/* Voices                                                             */
/* ------------------------------------------------------------------ */

export function listVoices(api: SpeechApi | null): VoiceLike[] {
  try {
    return api?.synth.getVoices() ?? [];
  } catch {
    return [];
  }
}

/** Voices load asynchronously in some browsers (Chrome); this fires when they arrive. */
export function onVoicesChanged(api: SpeechApi | null, cb: () => void): () => void {
  const synth = api?.synth;
  if (!synth?.addEventListener) return () => {};
  try {
    synth.addEventListener("voiceschanged", cb);
  } catch {
    return () => {};
  }
  return () => synth.removeEventListener?.("voiceschanged", cb);
}

/**
 * Voices worth offering for `lang` (matched on the primary language,
 * so "en" offers en-NG, en-GB, en-US…). Sorted with the user's own
 * region first, then by name. Never promises a particular accent.
 */
export function voicesFor(voices: VoiceLike[], lang: string | null): VoiceLike[] {
  const primary = (lang ?? "").split(/[-_]/)[0].toLowerCase();
  const matching = primary
    ? voices.filter((v) => v.lang.toLowerCase().replace("_", "-").split("-")[0] === primary)
    : voices;
  const regionOf = (tag: string) => tag.toLowerCase().replace("_", "-");
  const wanted = regionOf(lang ?? "");
  return [...matching].sort((a, b) => {
    const ra = regionOf(a.lang) === wanted ? 0 : 1;
    const rb = regionOf(b.lang) === wanted ? 0 : 1;
    return ra - rb || a.name.localeCompare(b.name);
  });
}

/* ------------------------------------------------------------------ */
/* Preferences (per device)                                           */
/* ------------------------------------------------------------------ */

const PREFS_KEY = "kooking:read-aloud:v1";

export interface ReadAloudPrefs {
  /** Read each new step when the cook moves to it. Off by default. */
  auto: boolean;
  /** Chosen voice, or null for the device default. */
  voiceURI: string | null;
}

export const DEFAULT_PREFS: ReadAloudPrefs = { auto: false, voiceURI: null };

export function loadReadAloudPrefs(): ReadAloudPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
    const r = raw as Partial<ReadAloudPrefs>;
    return {
      auto: r.auto === true,
      voiceURI: typeof r.voiceURI === "string" && r.voiceURI ? r.voiceURI : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveReadAloudPrefs(prefs: ReadAloudPrefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preference just won't persist.
  }
}
