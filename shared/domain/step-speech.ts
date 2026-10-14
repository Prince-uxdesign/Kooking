import type { StepDisplay } from "./cooking-session";

/**
 * Read-aloud text for one Cooking Mode step (Phase 29). Built only from
 * `stepDisplay`, so it says exactly what the screen shows: the verbatim
 * instruction, the session's scaled quantities and the recipe's own
 * cues. Nothing is added or reworded beyond making units speakable.
 *
 * Order: step number → instruction → ingredients → prep → heat, time
 * and timer → safety → sensory cues → "ready to move on when".
 */

const UNIT_WORDS: Record<string, [singular: string, plural: string]> = {
  g: ["gram", "grams"],
  kg: ["kilogram", "kilograms"],
  ml: ["millilitre", "millilitres"],
  l: ["litre", "litres"],
  tbsp: ["tablespoon", "tablespoons"],
  tsp: ["teaspoon", "teaspoons"],
  cup: ["cup", "cups"],
  piece: ["piece", "pieces"],
  clove: ["clove", "cloves"],
  slice: ["slice", "slices"],
  stalk: ["stalk", "stalks"],
  bunch: ["bunch", "bunches"],
  sachet: ["sachet", "sachets"],
  tin: ["tin", "tins"],
  pinch: ["pinch", "pinches"],
};

const FRACTION_WORDS: Record<string, string> = {
  "½": "a half",
  "¼": "a quarter",
  "¾": "three quarters",
  "⅓": "a third",
  "⅔": "two thirds",
};

const QUANTITY = new RegExp(
  String.raw`(\d+(?:\.\d+)?)?([½¼¾⅓⅔])?\s(${Object.keys(UNIT_WORDS).join("|")})\b`,
  "g",
);

/**
 * "1½ cup" → "1 and a half cups", "400 g" → "400 grams", "20 min" →
 * "20 minutes". Only rewrites a unit that directly follows a number,
 * so ingredient names and instructions are left alone.
 */
export function speakable(text: string): string {
  return text
    .replace(QUANTITY, (match, whole: string | undefined, glyph: string | undefined, unit) => {
      if (!whole && !glyph) return match;
      const [one, many] = UNIT_WORDS[unit];
      const fraction = glyph ? FRACTION_WORDS[glyph] : null;
      const number = whole && fraction ? `${whole} and ${fraction}` : (whole ?? fraction);
      const singular = (whole === "1" && !glyph) || (!whole && glyph !== "¾" && glyph !== "⅔");
      return `${number} ${singular ? one : many}`;
    })
    .replace(/\b(\d+) hr\b/g, (_, n: string) => `${n} ${n === "1" ? "hour" : "hours"}`)
    .replace(/\b(\d+) min\b/g, (_, n: string) => `${n} ${n === "1" ? "minute" : "minutes"}`);
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/**
 * Engines cut off or stall on long utterances (notably Chrome), and
 * resuming after an interrupted pause restarts the current piece, so
 * long text is spoken a sentence at a time.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The pieces to speak for a step, in order. Empty when there's nothing to read. */
export function stepSpeech(step: StepDisplay | null | undefined): string[] {
  if (!step) return [];
  const parts: string[] = [];
  const instruction = step.instruction?.trim();

  const ingredients = (step.ingredients ?? []).map((i) => i.spoken?.trim()).filter(Boolean);
  const details = [
    step.heat,
    step.duration,
    step.timerLabel ? `There's a timer for this step: ${step.timerLabel}` : null,
  ].filter((d): d is string => Boolean(d?.trim()));
  const cues = (step.cues ?? []).filter((c) => c.text?.trim());

  if (instruction) parts.push(sentence(instruction));
  if (ingredients.length > 0) parts.push(`You need: ${ingredients.join(" ")}`);
  if (step.preparationNotes) parts.push(`Prep: ${sentence(step.preparationNotes)}`);
  if (details.length > 0) parts.push(details.map(sentence).join(" "));
  if (step.safetyNote) parts.push(`Safety: ${sentence(step.safetyNote)}`);
  for (const cue of cues) parts.push(`${cue.label}: ${sentence(cue.text)}`);
  if (step.completionNote) parts.push(`Ready to move on when: ${sentence(step.completionNote)}`);

  if (parts.length === 0) return [];
  // The number only matters once there's something to say about the step.
  const heading = step.number && step.total ? `Step ${step.number} of ${step.total}.` : null;
  return [heading, ...parts]
    .filter((p): p is string => Boolean(p))
    .flatMap((p) => splitSentences(speakable(p)).map(sentence));
}
