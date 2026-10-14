import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReadAloud,
  listVoices,
  loadReadAloudPrefs,
  onVoicesChanged,
  saveReadAloudPrefs,
  speechApi,
  voicesFor,
  type ReadAloudState,
  type SpeechApi,
  type UtteranceLike,
  type VoiceLike,
} from "./read-aloud";

/* A scripted stand-in for window.speechSynthesis. Nothing makes sound. */

class FakeUtterance implements UtteranceLike {
  lang = "";
  voice: VoiceLike | null = null;
  rate = 1;
  onstart: UtteranceLike["onstart"] = null;
  onend: UtteranceLike["onend"] = null;
  onerror: UtteranceLike["onerror"] = null;
  constructor(public text: string) {}
}

function fakeSpeech(opts: { pauseCancels?: boolean; voices?: VoiceLike[] } = {}) {
  let queue: FakeUtterance[] = [];
  const spoken: FakeUtterance[] = [];
  let speaking = false;
  let paused = false;
  const voiceListeners = new Set<() => void>();
  const synth = {
    get speaking() {
      return speaking;
    },
    get paused() {
      return paused;
    },
    pending: false,
    speak: vi.fn((u: FakeUtterance) => {
      queue.push(u);
      spoken.push(u);
    }),
    cancel: vi.fn(() => {
      const dropped = queue;
      queue = [];
      speaking = false;
      paused = false;
      // Real engines report cancelled utterances as interrupted/canceled errors.
      for (const u of dropped) u.onerror?.({ error: "interrupted" });
    }),
    pause: vi.fn(() => {
      if (opts.pauseCancels) {
        // Some Android engines: pause behaves like cancel, firing `end`.
        const dropped = queue;
        queue = [];
        speaking = false;
        for (const u of dropped) u.onend?.({});
        return;
      }
      paused = true;
    }),
    resume: vi.fn(() => {
      paused = false;
    }),
    getVoices: vi.fn(() => opts.voices ?? []),
    addEventListener: vi.fn((_: string, cb: () => void) => voiceListeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => voiceListeners.delete(cb)),
  };
  const api: SpeechApi = { synth, Utterance: FakeUtterance };
  return {
    api,
    synth,
    spoken,
    queue: () => queue,
    /** Engine begins the head of the queue. */
    begin() {
      speaking = true;
      queue[0]?.onstart?.({});
    },
    /** Engine finishes the head of the queue and starts the next. */
    finishOne() {
      const u = queue.shift();
      u?.onend?.({});
      if (queue.length > 0) queue[0].onstart?.({});
      else speaking = false;
    },
    fail(error: string) {
      const u = queue.shift();
      speaking = false;
      u?.onerror?.({ error });
    },
    voicesChanged() {
      for (const cb of voiceListeners) cb();
    },
  };
}

function manualTimers() {
  const pending = new Map<number, () => void>();
  let id = 0;
  return {
    setTimeout: (fn: () => void) => {
      pending.set(++id, fn);
      return id;
    },
    clearTimeout: (h: unknown) => void pending.delete(h as number),
    flush() {
      const fns = [...pending.values()];
      pending.clear();
      fns.forEach((f) => f());
    },
  };
}

const stepA = { key: "sess:s1", segments: ["Step 1 of 2.", "Wash the rice.", "Rice: 2 cups."] };
const stepB = { key: "sess:s2", segments: ["Step 2 of 2.", "Fry the onions."] };

function setup(opts?: Parameters<typeof fakeSpeech>[0]) {
  const fake = fakeSpeech(opts);
  const timers = manualTimers();
  const ra = createReadAloud(fake.api, timers);
  const states: ReadAloudState[] = [];
  ra.subscribe((s) => states.push(s));
  return { fake, timers, ra, states, status: () => ra.getState().status };
}

describe("speech support", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is unsupported without the Web Speech API, and every control is a safe no-op", () => {
    const ra = createReadAloud(null);
    expect(ra.getState().status).toBe("unsupported");
    ra.play(stepA);
    ra.pause();
    ra.resume();
    ra.replay(stepA);
    ra.stop();
    ra.reset();
    ra.dispose();
    expect(ra.getState().status).toBe("unsupported");
  });

  it("detects the API by feature, not by assumption", () => {
    expect(speechApi()).toBeNull(); // node: no window
    vi.stubGlobal("window", {});
    expect(speechApi()).toBeNull();
    vi.stubGlobal("window", { speechSynthesis: {} });
    expect(speechApi()).toBeNull(); // no utterance constructor
    const synth = fakeSpeech().synth;
    vi.stubGlobal("window", { speechSynthesis: synth, SpeechSynthesisUtterance: FakeUtterance });
    expect(speechApi()?.synth).toBe(synth);
  });

  it("starts idle when supported", () => {
    expect(setup().status()).toBe("idle");
  });
});

describe("playing a step", () => {
  it("queues one utterance per sentence and reports starting → playing → done", () => {
    const { fake, ra, status } = setup();
    ra.play({ ...stepA, lang: "en-NG" });
    expect(fake.synth.cancel).toHaveBeenCalledTimes(1); // clears anything stale first
    expect(fake.spoken.map((u) => u.text)).toEqual(stepA.segments);
    expect(fake.spoken.every((u) => u.lang === "en-NG")).toBe(true);
    expect(status()).toBe("starting");
    fake.begin();
    expect(status()).toBe("playing");
    expect(ra.getState().key).toBe("sess:s1");
    fake.finishOne();
    fake.finishOne();
    expect(status()).toBe("playing");
    fake.finishOne();
    expect(status()).toBe("done");
  });

  it("uses the chosen voice and its language", () => {
    const { fake, ra } = setup();
    const voice = { voiceURI: "v1", name: "Ada", lang: "en-NG" };
    ra.play({ ...stepA, lang: "en", voice });
    expect(fake.spoken[0].voice).toBe(voice);
    expect(fake.spoken[0].lang).toBe("en-NG");
  });

  it("ignores a second Play for the same step while it's reading (no duplicates)", () => {
    const { fake, ra } = setup();
    ra.play(stepA);
    ra.play(stepA); // quick double tap, before start
    fake.begin();
    ra.play(stepA); // and again while playing
    expect(fake.synth.speak).toHaveBeenCalledTimes(stepA.segments.length);
    expect(fake.synth.cancel).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a step with no content", () => {
    const { fake, ra, status } = setup();
    ra.play({ key: "k", segments: [] });
    expect(fake.synth.speak).not.toHaveBeenCalled();
    expect(status()).toBe("idle");
  });
});

describe("pause, resume, replay, stop", () => {
  it("pauses and resumes in place where the engine supports it", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.begin();
    ra.pause();
    expect(fake.synth.pause).toHaveBeenCalled();
    expect(status()).toBe("paused");
    ra.resume();
    expect(fake.synth.resume).toHaveBeenCalled();
    expect(status()).toBe("playing");
    expect(fake.synth.speak).toHaveBeenCalledTimes(stepA.segments.length); // nothing re-queued
  });

  it("Play while paused on the same step resumes instead of restarting", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.begin();
    ra.pause();
    ra.play(stepA);
    expect(status()).toBe("playing");
    expect(fake.synth.resume).toHaveBeenCalled();
  });

  it("restarts from the current sentence when the engine dropped the paused reading", () => {
    const { fake, ra, status } = setup({ pauseCancels: true });
    ra.play(stepA);
    fake.begin();
    fake.finishOne(); // now on "Wash the rice."
    ra.pause();
    expect(status()).toBe("paused"); // the lost reading doesn't end the pause
    ra.resume();
    expect(fake.queue().map((u) => u.text)).toEqual(["Wash the rice.", "Rice: 2 cups."]);
    expect(status()).toBe("starting");
    fake.begin();
    expect(status()).toBe("playing");
  });

  it("replays from the top, cancelling the current reading", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.begin();
    fake.finishOne();
    ra.replay(stepA);
    expect(fake.queue().map((u) => u.text)).toEqual(stepA.segments);
    fake.begin();
    expect(status()).toBe("playing");
    // The interrupted first reading's late events can't end the replay.
    fake.spoken[2].onend?.({});
    expect(status()).toBe("playing");
  });

  it("stops: cancels the engine and reports stopped", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.begin();
    ra.stop();
    expect(fake.queue()).toEqual([]);
    expect(status()).toBe("stopped");
    ra.play(stepA); // can start again after stopping
    expect(status()).toBe("starting");
  });

  it("stop with nothing playing keeps the current status", () => {
    const { ra, status } = setup();
    ra.stop();
    expect(status()).toBe("idle");
  });
});

describe("moving between steps", () => {
  it("cancels the previous step and ignores its stale events", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.begin();
    const oldUtterances = [...fake.queue()];
    ra.reset();
    expect(status()).toBe("idle");
    ra.play(stepB);
    fake.begin();
    // Late events from step 1's utterances (some engines fire after cancel).
    for (const u of oldUtterances) {
      u.onend?.({});
      u.onerror?.({ error: "synthesis-failed" });
    }
    expect(ra.getState()).toMatchObject({ status: "playing", key: "sess:s2" });
    expect(fake.queue().map((u) => u.text)).toEqual(stepB.segments);
  });

  it("reading another step while one is playing replaces it", () => {
    const { fake, ra } = setup();
    ra.play(stepA);
    fake.begin();
    ra.play(stepB);
    expect(fake.queue().map((u) => u.text)).toEqual(stepB.segments);
    expect(ra.getState().key).toBe("sess:s2");
  });
});

describe("errors and interruptions", () => {
  it("reports engine errors in plain language and silences the rest", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.fail("not-allowed");
    expect(status()).toBe("error");
    expect(ra.getState().message).toMatch(/Tap Read aloud/);
    expect(fake.queue()).toEqual([]);
  });

  it("uses a generic message for unknown errors", () => {
    const { fake, ra } = setup();
    ra.play(stepA);
    fake.fail("synthesis-failed");
    expect(ra.getState().message).toMatch(/still on screen/);
  });

  it("treats an outside interruption (e.g. a phone call) as stopped", () => {
    const { fake, ra, status } = setup();
    ra.play(stepA);
    fake.begin();
    fake.fail("interrupted");
    expect(status()).toBe("stopped");
  });

  it("errors if speech never starts, but accepts engines that skip the start event", () => {
    const silent = setup();
    silent.ra.play(stepA);
    silent.timers.flush();
    expect(silent.status()).toBe("error");

    const quiet = setup();
    quiet.ra.play(stepA);
    // Speaking without an onstart event.
    Object.defineProperty(quiet.fake.synth, "speaking", { get: () => true });
    quiet.timers.flush();
    expect(quiet.status()).toBe("playing");
  });

  it("survives an engine that throws", () => {
    const { fake, ra, status } = setup();
    fake.synth.speak.mockImplementation(() => {
      throw new Error("boom");
    });
    ra.play(stepA);
    expect(status()).toBe("error");
  });
});

describe("cleanup", () => {
  it("dispose cancels speech, stops notifying and ignores later calls and events", () => {
    const { fake, ra, states } = setup();
    ra.play(stepA);
    fake.begin();
    const live = [...fake.queue()];
    const seen = states.length;
    ra.dispose();
    expect(fake.synth.cancel).toHaveBeenCalledTimes(2);
    expect(fake.queue()).toEqual([]);
    for (const u of live) u.onend?.({});
    ra.play(stepB);
    expect(fake.synth.speak).toHaveBeenCalledTimes(stepA.segments.length);
    expect(states.length).toBe(seen);
  });
});

describe("voices", () => {
  const voices: VoiceLike[] = [
    { voiceURI: "us", name: "Samantha", lang: "en-US" },
    { voiceURI: "ng", name: "Ezinne", lang: "en-NG" },
    { voiceURI: "fr", name: "Amélie", lang: "fr-FR" },
    { voiceURI: "gb", name: "Daniel", lang: "en_GB" },
  ];

  it("offers voices for the language, the exact region first", () => {
    expect(voicesFor(voices, "en-NG").map((v) => v.voiceURI)).toEqual(["ng", "gb", "us"]);
    expect(voicesFor(voices, "en").map((v) => v.voiceURI)).toEqual(["gb", "ng", "us"]);
    expect(voicesFor(voices, null)).toHaveLength(4);
    expect(voicesFor([], "en")).toEqual([]);
  });

  it("lists voices and hears when they load late", () => {
    const fake = fakeSpeech({ voices });
    expect(listVoices(fake.api)).toHaveLength(4);
    expect(listVoices(null)).toEqual([]);
    const cb = vi.fn();
    const off = onVoicesChanged(fake.api, cb);
    fake.voicesChanged();
    off();
    fake.voicesChanged();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(onVoicesChanged(null, cb)).toBeTypeOf("function");
  });
});

describe("preferences", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to auto-read off and the device voice, and round-trips", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    });
    expect(loadReadAloudPrefs()).toEqual({ auto: false, voiceURI: null });
    saveReadAloudPrefs({ auto: true, voiceURI: "ng" });
    expect(loadReadAloudPrefs()).toEqual({ auto: true, voiceURI: "ng" });
    store.set("kooking:read-aloud:v1", "{broken");
    expect(loadReadAloudPrefs()).toEqual({ auto: false, voiceURI: null });
  });

  it("falls back quietly when storage is unavailable", () => {
    expect(loadReadAloudPrefs()).toEqual({ auto: false, voiceURI: null });
    expect(() => saveReadAloudPrefs({ auto: true, voiceURI: null })).not.toThrow();
  });
});
