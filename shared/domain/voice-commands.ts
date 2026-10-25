/**
 * Voice commands for Cooking Mode (Phase 30). A fixed phrase list,
 * not a chatbot: every command maps to one explicit action type, and
 * anything else is rejected. Patterns match the WHOLE utterance, so
 * ordinary speech that happens to contain "next" or "pause" (or the
 * read-aloud voice heard through the mic) is never taken as a command.
 *
 * "Done", "finished", "it's ready" and similar are deliberately not
 * commands: nothing is marked complete because of a phrase that only
 * sounds like completion.
 */

export type VoiceTarget = "any" | "reading" | "timer";

export type VoiceCommand =
  | { type: "repeat" }
  | { type: "read-next" }
  | { type: "previous-step" }
  | { type: "next-step" }
  | { type: "start-timer"; seconds: number }
  | { type: "ingredient-quantity"; ingredient: string }
  | { type: "pause"; target: VoiceTarget }
  | { type: "resume"; target: VoiceTarget }
  | { type: "stop-reading" }
  | { type: "stop-listening" };

export type ParseFailure = {
  ok: false;
  reason: "empty" | "unrecognized" | "needs-duration" | "invalid-duration" | "ambiguous";
  message: string;
};

export type ParseResult = { ok: true; command: VoiceCommand } | ParseFailure;

/** Voice timers: at least a few seconds, at most 4 hours. */
export const VOICE_TIMER_MIN_SECONDS = 5;
export const VOICE_TIMER_MAX_SECONDS = 4 * 3600;

const FILLER_START =
  /^(?:(?:ok(?:ay)?|hey|hi|um+|uh+|er+|so|and|now|fork|cooking|please|can you|could you|would you)\s+)+/;
const FILLER_END = /(?:\s+(?:please|thanks|thank you|now))+$/;

/**
 * Lowercase, drop punctuation that doesn't change meaning, join "ten-
 * minute" into words, and trim politeness and fillers at either end.
 */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "")
    .replace(/[-–—_/]/g, " ")
    .replace(/[^\p{L}\p{N}.\s]/gu, " ")
    .replace(/\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(FILLER_START, "")
    .replace(FILLER_END, "")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Durations                                                          */
/* ------------------------------------------------------------------ */

const SMALL: Record<string, number> = {
  zero: 0,
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};
const UNIT_SECONDS: Record<string, number> = {
  second: 1,
  seconds: 1,
  sec: 1,
  secs: 1,
  minute: 60,
  minutes: 60,
  min: 60,
  mins: 60,
  hour: 3600,
  hours: 3600,
  hr: 3600,
  hrs: 3600,
};

/** "ten", "twenty five", "25", "1.5", "a", "one and a half" → number; null if not a number. */
export function parseNumberWords(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+(?:\.\d+)?$/.test(t)) return Number(t);
  const half = /^(.+?) and a half$/.exec(t);
  if (half) {
    const whole = parseNumberWords(half[1]);
    return whole === null ? null : whole + 0.5;
  }
  if (t === "half a" || t === "half an" || t === "a half") return 0.5;
  const words = t.split(" ");
  if (words.length === 1) {
    if (words[0] in SMALL) return SMALL[words[0]];
    if (words[0] in TENS) return TENS[words[0]];
    return null;
  }
  if (words.length === 2 && words[0] in TENS && words[1] in SMALL && SMALL[words[1]] >= 1) {
    if (words[1] === "a" || words[1] === "an") return null;
    return TENS[words[0]] + SMALL[words[1]];
  }
  return null;
}

/**
 * Seconds in a spoken duration: "10 minutes", "ten minute", "an hour
 * and 15 minutes", "one and a half hours", "half an hour", "90 seconds".
 * Null when it isn't a duration at all.
 */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (t === "half an hour" || t === "half hour" || t === "a half hour") return 1800;
  // "an hour and a half" / "a minute and a half"
  const andHalf = /^(.+?) (hours?|minutes?|mins?|hrs?) and a half$/.exec(t);
  if (andHalf) {
    const n = parseNumberWords(andHalf[1]);
    return n === null ? null : Math.round((n + 0.5) * UNIT_SECONDS[andHalf[2]]);
  }
  // Split "1 hour 15 minutes" / "an hour and 15 minutes" after each unit word.
  const parts = t.split(/(?<=\b(?:hours?|hrs?|minutes?|mins?|seconds?|secs?))(?: and |, | )/);
  let total = 0;
  for (const part of parts) {
    const m = /^(.+?) (hours?|minutes?|mins?|hrs?|seconds?|secs?)$/.exec(part.trim());
    if (!m) return null;
    const n = parseNumberWords(m[1]);
    if (n === null) return null;
    total += n * UNIT_SECONDS[m[2]];
  }
  return Math.round(total);
}

/* ------------------------------------------------------------------ */
/* Phrases                                                            */
/* ------------------------------------------------------------------ */

const STEP = "(?:step|instruction)";
const phrase = (alternatives: string[]) => new RegExp(`^(?:${alternatives.join("|")})$`);

const REPEAT = phrase([
  "repeat",
  "repeat (?:that|it|this|again)",
  `repeat (?:this |the )?(?:step|instruction)`,
  "say (?:that|it) again",
  "read (?:that|it) again",
  `read (?:this |the )?(?:step|instruction)(?: again)?`,
  "again",
  "what was that",
  "come again",
]);

const READ_NEXT = phrase([
  `whats (?:the )?next(?: ${STEP})?`,
  `what is (?:the )?next(?: ${STEP})?`,
  "what comes next",
  "what do i do next",
  `read (?:the )?next (?:step|instruction)`,
  `what is after this(?: step)?`,
  `whats after this(?: step)?`,
]);

const PREVIOUS = phrase([
  "previous",
  "previous (?:step|instruction)",
  "go back(?: (?:a|one) step)?",
  "back",
  "step back",
  "back (?:a|one) step",
  "go to (?:the )?previous (?:step|instruction)",
]);

const NEXT = phrase([
  "next",
  "next (?:step|instruction)",
  "go to (?:the )?next (?:step|instruction)",
  "move (?:on )?to (?:the )?next (?:step|instruction)",
  "go next",
]);

const STOP_LISTENING = phrase([
  "stop listening",
  "stop voice(?: control| commands?)?",
  "turn off (?:the )?(?:mic|microphone|voice(?: control)?)",
  "(?:mic|microphone) off",
  "stop (?:the )?(?:mic|microphone)",
  "cancel listening",
]);

const STOP_READING = phrase([
  "stop reading",
  "stop talking",
  "stop speaking",
  "stop (?:the )?read aloud",
  "be quiet",
  "quiet",
  "shush",
  "shh+",
]);

const READING_WORDS = "(?:reading|speech|speaking|talking|(?:the )?read aloud|the voice)";
const TIMER_WORDS = "(?:the |my )?timers?";

function pauseOrResume(text: string): VoiceCommand | null {
  const m = new RegExp(
    `^(pause|resume|unpause|continue|carry on)(?: (${READING_WORDS}|${TIMER_WORDS}))?$`,
  ).exec(text);
  const restart = new RegExp(
    `^(?:start|restart) (?:the )?(${READING_WORDS}|${TIMER_WORDS}) again$`,
  ).exec(text);
  if (!m && !restart) return null;
  const verb = m ? m[1] : "resume";
  const object = m ? m[2] : restart![1];
  const target: VoiceTarget = !object
    ? "any"
    : new RegExp(`^${TIMER_WORDS}$`).test(object)
      ? "timer"
      : "reading";
  return { type: verb === "pause" ? "pause" : "resume", target };
}

const TIMER_VERB = "(?:start|set|make|add|begin|put on|give me)";

function timer(text: string): ParseResult | null {
  if (!/\btimer\b/.test(text)) return null;
  const forms = [
    new RegExp(`^(?:${TIMER_VERB} )?(?:a |an |the )?(.+?) timer$`),
    new RegExp(`^(?:${TIMER_VERB} )?(?:a |an |the )?timer (?:for |of |to )?(.+)$`),
  ];
  for (const re of forms) {
    const m = re.exec(text);
    if (!m) continue;
    const spoken = m[1].trim();
    if (/^(?:a|an|the|new|another|my)$/.test(spoken)) continue;
    const seconds = parseDuration(spoken);
    if (seconds === null) {
      // "start a timer for soon" / "set the rice timer" — not a duration we know.
      if (/\d|minute|hour|second|min|hr|sec/.test(spoken)) {
        return {
          ok: false,
          reason: "invalid-duration",
          message: "I didn't catch the time. Try “start a ten-minute timer”.",
        };
      }
      return null;
    }
    if (seconds < VOICE_TIMER_MIN_SECONDS || seconds > VOICE_TIMER_MAX_SECONDS) {
      return {
        ok: false,
        reason: "invalid-duration",
        message:
          seconds < VOICE_TIMER_MIN_SECONDS
            ? "That timer is too short. Try a time of at least a few seconds."
            : "That timer is too long. Voice timers go up to 4 hours.",
      };
    }
    return { ok: true, command: { type: "start-timer", seconds } };
  }
  if (new RegExp(`^(?:${TIMER_VERB} )?(?:a |an |the )?(?:new )?timer$`).test(text)) {
    return {
      ok: false,
      reason: "needs-duration",
      message: "How long? Try “start a ten-minute timer”.",
    };
  }
  return null;
}

const INGREDIENT = [
  /^how (?:much|many) (.+?) (?:do i|should i|do we|should we|will i) (?:need|use|add|put in)(?: for (?:this|the) (?:step|recipe)| in total| altogether)?$/,
  /^how (?:much|many) (.+?) (?:does|do) (?:it|this|the recipe|this recipe|this step) (?:need|take|use)$/,
  /^how (?:much|many) (.+?) (?:goes|go) in$/,
  /^(?:what is|whats) the (?:amount|quantity) (?:of|for) (.+)$/,
];

function ingredient(text: string): VoiceCommand | null {
  for (const re of INGREDIENT) {
    const m = re.exec(text);
    if (!m) continue;
    const name = m[1].replace(/^(?:of (?:the )?|the |my |some )/, "").trim();
    if (!name || /^(?:it|this|that|them|stuff)$/.test(name)) return null;
    return { type: "ingredient-quantity", ingredient: name };
  }
  return null;
}

/**
 * The one entry point. `ok: false` always carries a short message the
 * kitchen can hear; nothing is executed for an unrecognized phrase.
 */
export function parseVoiceCommand(transcript: string): ParseResult {
  const text = normalizeTranscript(transcript);
  if (!text) return { ok: false, reason: "empty", message: "I didn't hear anything." };

  if (STOP_LISTENING.test(text)) return { ok: true, command: { type: "stop-listening" } };
  if (STOP_READING.test(text)) return { ok: true, command: { type: "stop-reading" } };
  if (REPEAT.test(text)) return { ok: true, command: { type: "repeat" } };
  if (READ_NEXT.test(text)) return { ok: true, command: { type: "read-next" } };
  if (NEXT.test(text)) return { ok: true, command: { type: "next-step" } };
  if (PREVIOUS.test(text)) return { ok: true, command: { type: "previous-step" } };

  const pr = pauseOrResume(text);
  if (pr) return { ok: true, command: pr };

  const t = timer(text);
  if (t) return t;

  const ing = ingredient(text);
  if (ing) return { ok: true, command: ing };

  if (text === "stop") {
    return {
      ok: false,
      reason: "ambiguous",
      message: "Stop what? Say “stop reading” or “stop listening”.",
    };
  }
  return { ok: false, reason: "unrecognized", message: "Sorry, that isn't a command I know." };
}

/**
 * Speech engines return a few guesses. Use the first one that's a
 * real command; otherwise report on the most likely guess.
 */
export function parseAlternatives(transcripts: string[]): ParseResult {
  let first: ParseResult | null = null;
  for (const t of transcripts) {
    const r = parseVoiceCommand(t);
    if (r.ok) return r;
    // A specific problem ("too long", "how long?") beats "not a command".
    if (!first || (first.reason === "unrecognized" && r.reason !== "unrecognized")) first = r;
  }
  return first ?? { ok: false, reason: "empty", message: "I didn't hear anything." };
}

/** Stable identity for spotting the same command recognized twice. */
export function commandKey(c: VoiceCommand): string {
  switch (c.type) {
    case "start-timer":
      return `start-timer:${c.seconds}`;
    case "ingredient-quantity":
      return `ingredient:${c.ingredient}`;
    case "pause":
    case "resume":
      return `${c.type}:${c.target}`;
    default:
      return c.type;
  }
}

/** Shown in the help list; only what's actually implemented. */
export const VOICE_HELP: Array<{ say: string; does: string }> = [
  { say: "Repeat that", does: "Reads this step again" },
  { say: "What's the next step?", does: "Reads the next step without moving" },
  { say: "Next step", does: "Marks this step done and moves on, like the button" },
  { say: "Previous step", does: "Goes back one step" },
  { say: "Start a ten-minute timer", does: "Starts a timer for this step" },
  { say: "How much rice do I need?", does: "Reads the amount for your servings" },
  { say: "Pause / Resume", does: "Reading or a timer, when it's clear which" },
  { say: "Stop reading", does: "Stops read-aloud" },
  { say: "Stop listening", does: "Turns the microphone off" },
];
