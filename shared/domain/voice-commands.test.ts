import { describe, expect, it } from "vitest";
import {
  commandKey,
  normalizeTranscript,
  parseAlternatives,
  parseDuration,
  parseNumberWords,
  parseVoiceCommand,
  type VoiceCommand,
} from "./voice-commands";

const command = (text: string): VoiceCommand | null => {
  const r = parseVoiceCommand(text);
  return r.ok ? r.command : null;
};

describe("normalizeTranscript", () => {
  it("lowercases and drops punctuation that doesn't change meaning", () => {
    expect(normalizeTranscript("Repeat that.")).toBe("repeat that");
    expect(normalizeTranscript("  What's the NEXT step?! ")).toBe("whats the next step");
    expect(normalizeTranscript("Start a ten-minute timer")).toBe("start a ten minute timer");
    expect(normalizeTranscript("Purée")).toBe("puree");
  });

  it("keeps decimals and trims fillers and politeness", () => {
    expect(normalizeTranscript("OK Fork, set a timer for 1.5 minutes please")).toBe(
      "set a timer for 1.5 minutes",
    );
    expect(normalizeTranscript("Um, next step, thanks")).toBe("next step");
    expect(normalizeTranscript("can you repeat that")).toBe("repeat that");
  });
});

describe("supported phrases", () => {
  it.each([
    ["Repeat that.", "repeat"],
    ["Say that again", "repeat"],
    ["Read the step again", "repeat"],
    ["What's the next step?", "read-next"],
    ["what is next", "read-next"],
    ["What comes next?", "read-next"],
    ["Previous step.", "previous-step"],
    ["Go back", "previous-step"],
    ["Next step.", "next-step"],
    ["Go to the next step", "next-step"],
    ["next", "next-step"],
    ["Stop listening.", "stop-listening"],
    ["Turn off the microphone", "stop-listening"],
    ["Stop reading", "stop-reading"],
    ["be quiet", "stop-reading"],
  ])("%s → %s", (text, type) => {
    expect(command(text)?.type).toBe(type);
  });

  it("pause and resume carry an explicit target only when one is said", () => {
    expect(command("Pause.")).toEqual({ type: "pause", target: "any" });
    expect(command("Resume")).toEqual({ type: "resume", target: "any" });
    expect(command("continue")).toEqual({ type: "resume", target: "any" });
    expect(command("pause the timer")).toEqual({ type: "pause", target: "timer" });
    expect(command("resume reading")).toEqual({ type: "resume", target: "reading" });
    expect(command("pause the read aloud")).toEqual({ type: "pause", target: "reading" });
    expect(command("start the timer again")).toEqual({ type: "resume", target: "timer" });
  });

  it("ingredient questions extract only the ingredient", () => {
    expect(command("How much rice do I need?")).toEqual({
      type: "ingredient-quantity",
      ingredient: "rice",
    });
    expect(command("how many tomatoes do I need for this step")).toEqual({
      type: "ingredient-quantity",
      ingredient: "tomatoes",
    });
    expect(command("How much of the tomato paste does the recipe need?")).toEqual({
      type: "ingredient-quantity",
      ingredient: "tomato paste",
    });
    expect(command("what's the amount of salt")).toEqual({
      type: "ingredient-quantity",
      ingredient: "salt",
    });
    expect(command("how much it do i need")).toBeNull();
  });
});

describe("unsupported and unrelated speech", () => {
  it.each([
    "I think the rice is done",
    "done",
    "it's ready",
    "finished",
    "the next step looks hard",
    "can you pause for a second while I check",
    "what should I cook tomorrow",
    "skip",
    "Simmer the tomato base on medium heat until the oil rises.",
    "Step 2 of 3.",
    "10 minutes timer started.",
  ])("rejects %j", (text) => {
    const r = parseVoiceCommand(text);
    expect(r.ok).toBe(false);
  });

  it("never treats completion-sounding phrases as next step", () => {
    for (const t of ["done", "I'm done", "that's done", "finished", "complete", "ready"]) {
      expect(command(t)).toBeNull();
    }
  });

  it("reports empty input and asks about a bare 'stop'", () => {
    expect(parseVoiceCommand("  ?! ")).toMatchObject({ ok: false, reason: "empty" });
    expect(parseVoiceCommand("Stop.")).toMatchObject({ ok: false, reason: "ambiguous" });
    expect(parseVoiceCommand("blah")).toMatchObject({ ok: false, reason: "unrecognized" });
  });
});

describe("timer durations", () => {
  it("parses number words and digits", () => {
    expect(parseNumberWords("ten")).toBe(10);
    expect(parseNumberWords("twenty five")).toBe(25);
    expect(parseNumberWords("an")).toBe(1);
    expect(parseNumberWords("one and a half")).toBe(1.5);
    expect(parseNumberWords("2.5")).toBe(2.5);
    expect(parseNumberWords("lots")).toBeNull();
    expect(parseNumberWords("twenty a")).toBeNull();
  });

  it("parses spoken durations", () => {
    expect(parseDuration("10 minutes")).toBe(600);
    expect(parseDuration("ten minute")).toBe(600);
    expect(parseDuration("twenty five minutes")).toBe(1500);
    expect(parseDuration("an hour and 15 minutes")).toBe(4500);
    expect(parseDuration("1 hour 15 minutes")).toBe(4500);
    expect(parseDuration("half an hour")).toBe(1800);
    expect(parseDuration("an hour and a half")).toBe(5400);
    expect(parseDuration("one and a half minutes")).toBe(90);
    expect(parseDuration("90 seconds")).toBe(90);
    expect(parseDuration("a while")).toBeNull();
  });

  it.each([
    ["Start a ten-minute timer.", 600],
    ["set a timer for 10 minutes", 600],
    ["timer for five minutes", 300],
    ["a 2 minute timer", 120],
    ["start a 90 second timer", 90],
    ["set the timer to half an hour", 1800],
    ["put on a one hour timer", 3600],
  ])("%s → %i s", (text, seconds) => {
    expect(command(text)).toEqual({ type: "start-timer", seconds });
  });

  it("rejects zero, negative, malformed and unreasonably large timers", () => {
    expect(parseVoiceCommand("start a zero minute timer")).toMatchObject({
      ok: false,
      reason: "invalid-duration",
    });
    expect(parseVoiceCommand("set a timer for minus five minutes")).toMatchObject({
      ok: false,
      reason: "invalid-duration",
    });
    expect(parseVoiceCommand("start a 3 second timer")).toMatchObject({
      reason: "invalid-duration",
    });
    expect(parseVoiceCommand("start a 5 hour timer")).toMatchObject({
      reason: "invalid-duration",
    });
    expect(parseVoiceCommand("set a timer for 1000 minutes")).toMatchObject({
      reason: "invalid-duration",
    });
    expect(parseVoiceCommand("set a timer for some minutes")).toMatchObject({
      reason: "invalid-duration",
    });
  });

  it("asks how long when no duration is given", () => {
    expect(parseVoiceCommand("start a timer")).toMatchObject({
      ok: false,
      reason: "needs-duration",
    });
    expect(parseVoiceCommand("timer")).toMatchObject({ ok: false, reason: "needs-duration" });
  });

  it("doesn't take a named timer as a duration", () => {
    expect(parseVoiceCommand("start the rice timer").ok).toBe(false);
  });
});

describe("alternatives and identity", () => {
  it("uses the first alternative that's a command", () => {
    expect(parseAlternatives(["next stop", "next step"])).toEqual({
      ok: true,
      command: { type: "next-step" },
    });
  });

  it("prefers a specific problem over 'not a command'", () => {
    expect(parseAlternatives(["blah", "start a timer"])).toMatchObject({
      reason: "needs-duration",
    });
    expect(parseAlternatives([])).toMatchObject({ reason: "empty" });
  });

  it("gives the same command the same key, and different ones different keys", () => {
    expect(commandKey(command("next step")!)).toBe(commandKey(command("Next.")!));
    expect(commandKey(command("start a 10 minute timer")!)).not.toBe(
      commandKey(command("start a 5 minute timer")!),
    );
    expect(commandKey(command("pause timer")!)).not.toBe(commandKey(command("pause reading")!));
  });
});
