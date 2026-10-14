import { afterEach, describe, expect, it, vi } from "vitest";
import {
  QUIET_TIMEOUT_MS,
  START_TIMEOUT_MS,
  createDeduper,
  createVoiceListener,
  recognitionApi,
  type RecognitionLike,
  type ResultEventLike,
} from "./voice-recognition";

/* A scripted stand-in for SpeechRecognition. No microphone, no network. */

const instances: FakeRecognition[] = [];

class FakeRecognition implements RecognitionLike {
  lang = "";
  continuous = false;
  interimResults = true;
  maxAlternatives = 1;
  onstart: RecognitionLike["onstart"] = null;
  onresult: RecognitionLike["onresult"] = null;
  onerror: RecognitionLike["onerror"] = null;
  onend: RecognitionLike["onend"] = null;
  started = 0;
  aborted = 0;
  stopped = 0;
  results: Array<{ isFinal: boolean; alts: string[] }> = [];
  constructor() {
    instances.push(this);
  }
  start() {
    this.started++;
  }
  stop() {
    this.stopped++;
  }
  abort() {
    this.aborted++;
  }
  /** Browser: mic granted, audio flowing. */
  fireStart() {
    this.onstart?.();
  }
  /** Add a result and deliver the event like Chrome (all results, resultIndex = new one). */
  say(alts: string[], isFinal = true) {
    this.results.push({ isFinal, alts });
    this.deliver(this.results.length - 1);
  }
  deliver(resultIndex: number) {
    const results = this.results.map((r) =>
      Object.assign(
        r.alts.map((transcript) => ({ transcript })),
        { isFinal: r.isFinal },
      ),
    );
    this.onresult?.({ resultIndex, results } as unknown as ResultEventLike);
  }
  fail(error: string) {
    this.onerror?.({ error });
  }
  end() {
    this.onend?.();
  }
}

function clock() {
  let t = 0;
  const pending = new Map<number, { at: number; fn: () => void }>();
  let id = 0;
  return {
    setTimeout: (fn: () => void, ms: number) => {
      pending.set(++id, { at: t + ms, fn });
      return id;
    },
    clearTimeout: (h: unknown) => void pending.delete(h as number),
    now: () => t,
    advance(ms: number) {
      t += ms;
      for (const [k, p] of [...pending]) {
        if (p.at <= t) {
          pending.delete(k);
          p.fn();
        }
      }
    },
  };
}

function setup() {
  instances.length = 0;
  const timers = clock();
  const phrases: string[][] = [];
  const l = createVoiceListener(FakeRecognition, {
    lang: "en-NG",
    onPhrase: (a) => phrases.push(a),
    timers,
  });
  return { l, timers, phrases, rec: () => instances[instances.length - 1] };
}

describe("support", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is unsupported without the API, and every call is a safe no-op", () => {
    const l = createVoiceListener(null, { onPhrase: () => {} });
    expect(l.getState().status).toBe("unsupported");
    l.start();
    l.stop();
    l.dispose();
    expect(l.getState().status).toBe("unsupported");
  });

  it("detects SpeechRecognition or the webkit-prefixed one", () => {
    expect(recognitionApi()).toBeNull(); // node: no window
    vi.stubGlobal("window", {});
    expect(recognitionApi()).toBeNull();
    vi.stubGlobal("window", { webkitSpeechRecognition: FakeRecognition });
    expect(recognitionApi()).toBe(FakeRecognition);
    vi.stubGlobal("window", { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: 1 });
    expect(recognitionApi()).toBe(FakeRecognition);
  });
});

describe("starting and stopping", () => {
  it("does nothing until start() is called (no mic on open)", () => {
    const { l } = setup();
    expect(l.getState().status).toBe("off");
    expect(instances).toHaveLength(0);
  });

  it("requests, then listens once the browser starts", () => {
    const { l, rec } = setup();
    l.start();
    expect(l.getState().status).toBe("requesting");
    expect(rec()).toMatchObject({ lang: "en-NG", continuous: true, interimResults: false });
    expect(rec().started).toBe(1);
    rec().fireStart();
    expect(l.getState().status).toBe("listening");
  });

  it("never runs two recognition sessions at once", () => {
    const { l, rec } = setup();
    l.start();
    l.start();
    rec().fireStart();
    l.start();
    expect(instances).toHaveLength(1);
    expect(rec().started).toBe(1);
  });

  it("stop aborts immediately and ignores anything after", () => {
    const { l, rec, phrases } = setup();
    l.start();
    rec().fireStart();
    const r = rec();
    l.stop();
    expect(r.aborted).toBe(1);
    expect(l.getState()).toEqual({ status: "off", message: null });
    r.say(["next step"]);
    r.end();
    expect(phrases).toEqual([]);
    expect(instances).toHaveLength(1); // no restart after a deliberate stop
  });

  it("can start again after stopping", () => {
    const { l } = setup();
    l.start();
    l.stop();
    l.start();
    expect(instances).toHaveLength(2);
    expect(l.getState().status).toBe("requesting");
  });

  it("dispose (leaving Cooking Mode) releases the mic and goes quiet", () => {
    const { l, rec, phrases } = setup();
    const seen: string[] = [];
    l.subscribe((s) => seen.push(s.status));
    l.start();
    rec().fireStart();
    const r = rec();
    const before = seen.length;
    l.dispose();
    expect(r.aborted).toBe(1);
    r.say(["next step"]);
    r.end();
    l.start();
    expect(phrases).toEqual([]);
    expect(instances).toHaveLength(1);
    expect(seen.length).toBe(before);
  });
});

describe("results", () => {
  it("hands over final results with their alternatives, once each", () => {
    const { l, rec, phrases } = setup();
    l.start();
    rec().fireStart();
    rec().say(["next step", "next stop"]);
    rec().deliver(0); // engine re-sends the same final result
    rec().say(["repeat that"]);
    expect(phrases).toEqual([["next step", "next stop"], ["repeat that"]]);
  });

  it("ignores interim results and empty transcripts", () => {
    const { l, rec, phrases } = setup();
    l.start();
    rec().say(["nex"], false);
    rec().say(["  "]);
    expect(phrases).toEqual([]);
  });
});

describe("errors, silence and timeouts", () => {
  it("permission denied", () => {
    const { l, rec } = setup();
    l.start();
    rec().fail("not-allowed");
    expect(l.getState().status).toBe("denied");
    expect(l.getState().message).toMatch(/site settings/);
    rec().end();
    expect(instances).toHaveLength(1); // doesn't keep asking
  });

  it("service not allowed counts as denied", () => {
    const { l, rec } = setup();
    l.start();
    rec().fail("service-not-allowed");
    expect(l.getState().status).toBe("denied");
  });

  it.each([
    ["network", /internet connection/],
    ["audio-capture", /No microphone/],
    ["language-not-supported", /language/],
    ["something-new", /stopped working/],
  ])("%s → error with a plain message", (code, message) => {
    const { l, rec } = setup();
    l.start();
    rec().fireStart();
    rec().fail(code);
    expect(l.getState().status).toBe("error");
    expect(l.getState().message).toMatch(message);
    expect(rec().aborted).toBe(1);
  });

  it("silence isn't an error: the engine's end is followed by a restart", () => {
    const { l, rec } = setup();
    l.start();
    rec().fireStart();
    rec().fail("no-speech");
    expect(l.getState().status).toBe("listening");
    rec().end();
    expect(instances).toHaveLength(2);
    expect(rec().started).toBe(1);
    expect(l.getState().status).toBe("listening");
  });

  it("stops after a quiet period with no commands, and says why", () => {
    const { l, rec, timers } = setup();
    l.start();
    rec().fireStart();
    timers.advance(QUIET_TIMEOUT_MS - 1000);
    rec().say(["next step"]); // a phrase resets the quiet timer
    timers.advance(QUIET_TIMEOUT_MS - 1000);
    expect(l.getState().status).toBe("listening");
    timers.advance(2000);
    expect(l.getState().status).toBe("off");
    expect(l.getState().message).toMatch(/2 minutes/);
    expect(rec().aborted).toBe(1);
  });

  it("gives up if the mic never starts", () => {
    const { l, timers } = setup();
    l.start();
    timers.advance(START_TIMEOUT_MS);
    expect(l.getState().status).toBe("error");
  });

  it("breaks a restart loop instead of spinning", () => {
    const { l, rec } = setup();
    l.start();
    for (let i = 0; i < 6; i++) rec().end();
    expect(l.getState().status).toBe("error");
    const count = instances.length;
    rec().end();
    expect(instances.length).toBe(count);
  });

  it("survives a constructor or start() that throws", () => {
    class Throws extends FakeRecognition {
      start() {
        throw new Error("InvalidStateError");
      }
    }
    const l = createVoiceListener(Throws, { onPhrase: () => {} });
    l.start();
    expect(l.getState().status).toBe("error");
  });
});

describe("createDeduper", () => {
  it("drops the same command repeated within the window, allows it after", () => {
    let t = 0;
    const fresh = createDeduper(2500, () => t);
    expect(fresh("next-step")).toBe(true);
    t = 400;
    expect(fresh("next-step")).toBe(false);
    t = 3000;
    expect(fresh("next-step")).toBe(true);
  });

  it("lets a different command through immediately", () => {
    let t = 0;
    const fresh = createDeduper(2500, () => t);
    expect(fresh("next-step")).toBe(true);
    t = 100;
    expect(fresh("previous-step")).toBe(true);
    expect(fresh("next-step")).toBe(true);
  });
});
