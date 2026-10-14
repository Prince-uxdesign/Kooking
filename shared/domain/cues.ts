import type { RecipeStep } from "./recipe-schema";

/**
 * Cooking cues (Phase 27). Turns a step's optional cue fields into an
 * ordered list for display. Only what the recipe states is returned;
 * absent fields produce nothing.
 */

export const CUE_KINDS = ["visual", "texture", "aroma", "sound", "other"] as const;
export type CueKind = (typeof CUE_KINDS)[number];

export const CUE_LABEL: Record<CueKind, string> = {
  visual: "Look",
  texture: "Feel",
  aroma: "Smell",
  sound: "Listen",
  other: "Also notice",
};

export interface Cue {
  kind: CueKind;
  label: string;
  text: string;
}

type CueSource = Pick<RecipeStep, "cues" | "sensoryCue">;

export function stepCues(step: CueSource): Cue[] {
  const out: Cue[] = [];
  const structured = step.cues ?? {};
  for (const kind of ["visual", "texture", "aroma", "sound"] as const) {
    const text = structured[kind]?.trim();
    if (text) out.push({ kind, label: CUE_LABEL[kind], text });
  }
  const other = step.sensoryCue?.trim();
  if (other) out.push({ kind: "other", label: CUE_LABEL.other, text: other });
  return out;
}

/**
 * The single best "is it ready?" line for a step: the explicit
 * completion guidance if given, otherwise the first sensory cue, else
 * null. Used when a timer runs out.
 */
export function readinessCheck(
  step: CueSource & Pick<RecipeStep, "completionNote">,
): string | null {
  return step.completionNote?.trim() || stepCues(step)[0]?.text || null;
}
