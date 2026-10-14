import { stepDisplay, stepIngredients } from "./cooking-session";
import { MAX_EXTRA_TIMERS, extraTimerLabel, type CookingSession } from "./session";
import { speakable, stepSpeech } from "./step-speech";
import { remainingMs, type SessionTimer } from "./timers";
import type { VoiceCommand } from "./voice-commands";

/**
 * What a recognized voice command should do right now (Phase 30).
 * Pure: it reads the session and the read-aloud state and returns one
 * plan; Cooking Mode carries it out with the same actions the buttons
 * use. Anything unclear becomes a question, anything impossible an
 * explanation; nothing is guessed.
 */

export type SpeechState =
  "unsupported" | "idle" | "starting" | "playing" | "paused" | "stopped" | "done" | "error";

export interface VoiceContext {
  session: CookingSession;
  now: number;
  speech: SpeechState;
}

export type VoicePlan =
  /** Replay the current step through read-aloud. */
  | { kind: "replay-step"; ack: string }
  /** Show `text`; read `segments` aloud when speech is available. */
  | { kind: "answer"; ack: string; text: string; segments: string[] }
  | { kind: "navigate"; direction: "next" | "previous"; ack: string }
  | { kind: "start-timer"; seconds: number; ack: string; say: string }
  | { kind: "timer"; timerId: string; action: "pause" | "resume"; ack: string; say: string }
  | { kind: "speech"; action: "pause" | "resume" | "stop"; ack: string }
  | { kind: "stop-listening"; ack: string }
  /** The action isn't possible right now; say why. */
  | { kind: "explain"; text: string }
  /** More than one thing fits; ask which. */
  | { kind: "clarify"; text: string };

const speechActive = (s: SpeechState) => s === "starting" || s === "playing";

function liveTimers(session: CookingSession, now: number, status: "running" | "paused") {
  return session.timers.filter(
    (t) => t.status === status && (status === "paused" || remainingMs(t, now) > 0),
  );
}

const timerName = (t: SessionTimer) => t.label ?? "Timer";

/* ------------------------------------------------------------------ */
/* Ingredient questions                                               */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set(["the", "a", "an", "of", "some", "my", "for", "this", "step", "recipe"]);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("oes")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("es") && /(?:ch|sh|x|s)es$/.test(word))
    return word.slice(0, -2);
  if (word.length > 2 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

export type IngredientLookup =
  | { kind: "found"; text: string; segments: string[] }
  | { kind: "ambiguous"; names: string[] }
  | { kind: "missing"; query: string };

/**
 * Answer "how much X do I need?" from the session's own snapshot (the
 * amounts scaled to the servings the cook started with) and, when this
 * step uses the line, the step's share. Matches on the ingredient
 * names in the recipe; never invents an amount.
 */
export function lookupIngredient(
  session: CookingSession,
  stepIndex: number,
  query: string,
): IngredientLookup {
  const wanted = tokens(query);
  if (wanted.length === 0) return { kind: "missing", query };

  const matches = session.snapshot.filter((line) => {
    const have = new Set(tokens(line.name));
    return wanted.every((w) => have.has(w));
  });
  // "rice" shouldn't be ambiguous between "Rice" and "Rice flour" if one is exact.
  const exact = matches.filter((l) => tokens(l.name).join(" ") === wanted.join(" "));
  const chosen = exact.length === 1 ? exact : matches;

  if (chosen.length === 0) return { kind: "missing", query };
  if (chosen.length > 1) return { kind: "ambiguous", names: chosen.map((l) => l.name) };

  const line = chosen[0];
  const amount =
    line.scaledQuantity === null
      ? line.scaling === "to-taste" || line.unit === null
        ? "to taste"
        : "the recipe doesn't give an amount"
      : `${line.approximate ? "about " : ""}${line.displayQuantity}`;
  const parts = [
    `${line.name}${line.preparation ? `, ${line.preparation}` : ""}: ${amount}${
      line.scaledQuantity === null ? "" : ` in total for ${session.servings} servings`
    }.`,
  ];
  const inStep = stepIngredients(session, stepIndex).find((i) => i.lineId === line.lineId);
  if (inStep && inStep.portion === "part") parts.push(`This step uses ${inStep.quantity}.`);
  if (line.requiresManual) parts.push("This amount isn't adjusted for servings.");
  const text = parts.join(" ");
  return { kind: "found", text, segments: [speakable(text)] };
}

/* ------------------------------------------------------------------ */
/* Planning                                                           */
/* ------------------------------------------------------------------ */

function pausePlan(target: "any" | "reading" | "timer", ctx: VoiceContext): VoicePlan {
  const reading = speechActive(ctx.speech);
  const running = liveTimers(ctx.session, ctx.now, "running");

  if (target === "reading") {
    return reading
      ? { kind: "speech", action: "pause", ack: "Reading paused" }
      : { kind: "explain", text: "Nothing is being read right now." };
  }
  if (target === "timer" || !reading) {
    if (running.length === 0) {
      return {
        kind: "explain",
        text: target === "timer" ? "No timer is running." : "Nothing is running to pause.",
      };
    }
    if (running.length > 1) {
      return {
        kind: "clarify",
        text: `${running.length} timers are running. Tap Pause on the one you want.`,
      };
    }
    const t = running[0];
    return {
      kind: "timer",
      timerId: t.id,
      action: "pause",
      ack: `${timerName(t)} paused`,
      say: `${timerName(t)} paused.`,
    };
  }
  // Reading is active and the cook didn't say what to pause.
  if (running.length > 0) {
    return { kind: "clarify", text: "Pause what? Say “pause reading” or “pause timer”." };
  }
  return { kind: "speech", action: "pause", ack: "Reading paused" };
}

function resumePlan(target: "any" | "reading" | "timer", ctx: VoiceContext): VoicePlan {
  const reading = ctx.speech === "paused";
  const paused = liveTimers(ctx.session, ctx.now, "paused");

  if (target === "reading") {
    return reading
      ? { kind: "speech", action: "resume", ack: "Reading resumed" }
      : { kind: "explain", text: "Reading isn't paused." };
  }
  if (target === "timer" || !reading) {
    if (paused.length === 0) {
      if (target === "any" && ctx.session.status === "paused") {
        return { kind: "explain", text: "Cooking is paused. Tap Resume cooking to carry on." };
      }
      return {
        kind: "explain",
        text: target === "timer" ? "No timer is paused." : "Nothing is paused.",
      };
    }
    if (paused.length > 1) {
      return {
        kind: "clarify",
        text: `${paused.length} timers are paused. Tap Resume on the one you want.`,
      };
    }
    const t = paused[0];
    return {
      kind: "timer",
      timerId: t.id,
      action: "resume",
      ack: `${timerName(t)} resumed`,
      say: `${timerName(t)} resumed.`,
    };
  }
  if (paused.length > 0) {
    return { kind: "clarify", text: "Resume what? Say “resume reading” or “resume timer”." };
  }
  return { kind: "speech", action: "resume", ack: "Reading resumed" };
}

export function planVoiceCommand(command: VoiceCommand, ctx: VoiceContext): VoicePlan {
  const { session } = ctx;
  const index = session.currentStepIndex;
  const count = session.steps.length;
  const speechOn = ctx.speech !== "unsupported";

  switch (command.type) {
    case "stop-listening":
      return { kind: "stop-listening", ack: "Stopped listening" };

    case "repeat": {
      if (!speechOn) {
        return {
          kind: "explain",
          text: "Read-aloud isn't available in this browser. The step is on screen.",
        };
      }
      if (stepSpeech(stepDisplay(session, index)).length === 0) {
        return { kind: "explain", text: "There's nothing to read for this step." };
      }
      return { kind: "replay-step", ack: `Reading step ${index + 1} again` };
    }

    case "read-next": {
      if (index >= count - 1) {
        return { kind: "explain", text: "This is the last step. There's no next step." };
      }
      const next = stepDisplay(session, index + 1);
      const segments = stepSpeech(next);
      if (!next || segments.length === 0) {
        return { kind: "explain", text: `Step ${index + 2} has no instruction to read.` };
      }
      return {
        kind: "answer",
        ack: `Next is step ${next.number}`,
        text: `Next, step ${next.number}: ${next.instruction}`,
        segments: [`Next.`, ...segments],
      };
    }

    case "next-step":
      if (session.status !== "active") {
        return { kind: "explain", text: "Cooking is paused. Tap Resume cooking first." };
      }
      if (index >= count - 1) {
        return {
          kind: "explain",
          text: "This is the last step. Tap Finish cooking when you're done.",
        };
      }
      return {
        kind: "navigate",
        direction: "next",
        ack: `Step ${index + 1} done. Now on step ${index + 2}`,
      };

    case "previous-step":
      if (session.status !== "active") {
        return { kind: "explain", text: "Cooking is paused. Tap Resume cooking first." };
      }
      if (index <= 0) return { kind: "explain", text: "You're on the first step." };
      return { kind: "navigate", direction: "previous", ack: `Back to step ${index}` };

    case "start-timer": {
      const live = session.timers.filter(
        (t) => t.id.startsWith("extra:") && (t.status === "running" || t.status === "paused"),
      );
      if (live.length >= MAX_EXTRA_TIMERS) {
        return {
          kind: "explain",
          text: `You already have ${MAX_EXTRA_TIMERS} extra timers. Stop one before adding another.`,
        };
      }
      const label = extraTimerLabel(command.seconds).replace(/ timer$/, "");
      return {
        kind: "start-timer",
        seconds: command.seconds,
        ack: `${label} timer started`,
        say: `${speakable(label.replace(/-/g, " "))} timer started.`,
      };
    }

    case "ingredient-quantity": {
      const found = lookupIngredient(session, index, command.ingredient);
      if (found.kind === "missing") {
        return {
          kind: "explain",
          text: `I can't find ${command.ingredient} in this recipe.`,
        };
      }
      if (found.kind === "ambiguous") {
        const names = found.names;
        const list =
          names.length === 2
            ? `${names[0]} or ${names[1]}`
            : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
        return { kind: "clarify", text: `Which one: ${list}? Ask again with the full name.` };
      }
      return { kind: "answer", ack: "Amount found", text: found.text, segments: found.segments };
    }

    case "pause":
      return pausePlan(command.target, ctx);
    case "resume":
      return resumePlan(command.target, ctx);

    case "stop-reading":
      return ctx.speech === "starting" || ctx.speech === "playing" || ctx.speech === "paused"
        ? { kind: "speech", action: "stop", ack: "Stopped reading" }
        : { kind: "explain", text: "Nothing is being read right now." };
  }
}
