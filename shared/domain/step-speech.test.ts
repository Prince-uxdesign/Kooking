import { describe, expect, it } from "vitest";
import type { StepDisplay, StepIngredient } from "./cooking-session";
import { speakable, splitSentences, stepSpeech } from "./step-speech";

const ingredient = (over: Partial<StepIngredient> = {}): StepIngredient => ({
  lineId: "l",
  name: "Tomato paste",
  preparation: null,
  note: null,
  kind: "amount",
  quantity: "70 g",
  approximate: false,
  notScaled: false,
  portion: "all",
  totalQuantity: null,
  alsoInSteps: [],
  spoken: "Tomato paste: 70 g.",
  ...over,
});

const base: StepDisplay = {
  id: "s2",
  number: 2,
  total: 5,
  instruction: "Simmer the tomato base until the oil rises",
  ingredients: [],
  heat: null,
  duration: null,
  timerLabel: null,
  cues: [],
  preparationNotes: null,
  completionNote: null,
  safetyNote: null,
  readinessCheck: null,
  isFirst: false,
  isLast: false,
  completed: false,
};

describe("speakable", () => {
  it("spells out abbreviated units after a number", () => {
    expect(speakable("Tomato paste: 70 g.")).toBe("Tomato paste: 70 grams.");
    expect(speakable("1 tsp salt and 2 tbsp oil")).toBe("1 teaspoon salt and 2 tablespoons oil");
    expect(speakable("About 1.5 kg")).toBe("About 1.5 kilograms");
    expect(speakable("500 ml water, 1 l stock")).toBe("500 millilitres water, 1 litre stock");
  });

  it("reads fraction glyphs as words, with the right plural", () => {
    expect(speakable("1½ cup")).toBe("1 and a half cups");
    expect(speakable("½ tsp")).toBe("a half teaspoon");
    expect(speakable("¾ cup")).toBe("three quarters cups");
    expect(speakable("2 clove")).toBe("2 cloves");
    expect(speakable("1 bunch")).toBe("1 bunch");
  });

  it("speaks durations in full", () => {
    expect(speakable("About 20 min")).toBe("About 20 minutes");
    expect(speakable("1 hr 5 min")).toBe("1 hour 5 minutes");
    expect(speakable("1 min")).toBe("1 minute");
  });

  it("leaves words that only look like units alone", () => {
    expect(speakable("Add the garlic clove and the tin of tomatoes")).toBe(
      "Add the garlic clove and the tin of tomatoes",
    );
    expect(speakable("Let it rest")).toBe("Let it rest");
  });
});

describe("splitSentences", () => {
  it("splits on sentence ends, not decimals", () => {
    expect(splitSentences("Stir well. Add 2.5 kg rice! Done?  Yes")).toEqual([
      "Stir well.",
      "Add 2.5 kg rice!",
      "Done?",
      "Yes",
    ]);
  });
});

describe("stepSpeech", () => {
  it("reads the step number then the verbatim instruction", () => {
    expect(stepSpeech(base)).toEqual([
      "Step 2 of 5.",
      "Simmer the tomato base until the oil rises.",
    ]);
  });

  it("orders instruction, quantities, prep, heat and time, safety, cues, completion", () => {
    const speech = stepSpeech({
      ...base,
      ingredients: [
        ingredient(),
        ingredient({ lineId: "m", name: "Rice", spoken: "Rice: 1½ cup, also used in step 4." }),
      ],
      preparationNotes: "Wash the rice first",
      heat: "Medium heat",
      duration: "About 10 min",
      timerLabel: "Simmer base",
      safetyNote: "Hot oil can spit",
      cues: [
        { kind: "visual", label: "Look", text: "Oil gathers at the edges" },
        { kind: "aroma", label: "Smell", text: "No raw tomato smell." },
      ],
      completionNote: "The base is thick and glossy",
    });
    expect(speech).toEqual([
      "Step 2 of 5.",
      "Simmer the tomato base until the oil rises.",
      "You need: Tomato paste: 70 grams.",
      "Rice: 1 and a half cups, also used in step 4.",
      "Prep: Wash the rice first.",
      "Medium heat.",
      "About 10 minutes.",
      "There's a timer for this step: Simmer base.",
      "Safety: Hot oil can spit.",
      "Look: Oil gathers at the edges.",
      "Smell: No raw tomato smell.",
      "Ready to move on when: The base is thick and glossy.",
    ]);
  });

  it("only says what the step has: no invented quantities, heat or timers", () => {
    const speech = stepSpeech(base).join(" ");
    expect(speech).not.toMatch(/heat|minute|timer|You need|Safety|Look/);
  });

  it("ends every spoken piece as a sentence, including ingredient notes", () => {
    const speech = stepSpeech({
      ...base,
      ingredients: [ingredient({ spoken: "Salt: to taste. Season gradually" })],
    });
    expect(speech).toContain("Season gradually.");
  });

  it("keeps 'to taste' and 'amount not given' as stated", () => {
    const speech = stepSpeech({
      ...base,
      ingredients: [
        ingredient({
          name: "Salt",
          kind: "to-taste",
          quantity: "To taste",
          spoken: "Salt: to taste.",
        }),
        ingredient({
          lineId: "p",
          name: "Pepper",
          kind: "unspecified",
          quantity: "Amount not given",
          spoken: "Pepper: amount not given.",
        }),
      ],
    });
    expect(speech).toContain("You need: Salt: to taste.");
    expect(speech).toContain("Pepper: amount not given.");
  });

  it("handles missing or incomplete step data without throwing", () => {
    expect(stepSpeech(null)).toEqual([]);
    expect(stepSpeech(undefined)).toEqual([]);
    expect(stepSpeech({ ...base, instruction: "   " })).toEqual([]);
    // Nothing but a heading isn't worth reading.
    expect(stepSpeech({ ...base, instruction: "" })).toEqual([]);
    // Partial data: blank cues and ingredient sentences are skipped.
    const partial = {
      ...base,
      instruction: "",
      heat: "High heat",
      cues: [{ kind: "visual", label: "Look", text: "  " }],
      ingredients: [ingredient({ spoken: "" })],
    } as StepDisplay;
    expect(stepSpeech(partial)).toEqual(["Step 2 of 5.", "High heat."]);
    // Without numbering, the heading is left out.
    expect(stepSpeech({ ...base, number: 0, total: 0 })).toEqual([
      "Simmer the tomato base until the oil rises.",
    ]);
  });
});
