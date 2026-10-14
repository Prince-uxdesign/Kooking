import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { createCookingSession, stepDisplay } from "./cooking-session";
import { emptyRecord } from "./kitchen-check";
import { recipeSchema } from "./recipe-schema";
import type { CookingSession } from "./session";

const recipe = recipeSchema.parse(seedJson);
const names: Record<string, string> = {
  "demo:long-grain-rice": "Long-grain rice",
  "demo:tomato-paste": "Tomato paste",
  "demo:salt": "Salt",
};

function session(servings = 4): CookingSession {
  const r = createCookingSession({
    id: "s",
    recipe,
    servings,
    record: {
      ...emptyRecord(recipe, servings, 1),
      entries: {
        "demo-rice": { have: true, qtyText: "2000", unit: "g" },
        "demo-tomato-paste": { have: true, qtyText: "500", unit: "g" },
      },
    },
    ingredientNames: names,
    now: 1,
  });
  if (!r.ok) throw new Error(r.message);
  return r.session;
}

describe("stepDisplay", () => {
  it("shows the recipe instruction verbatim with position", () => {
    const s = session();
    const first = stepDisplay(s, 0)!;
    expect(first.instruction).toBe(recipe.steps.find((st) => st.order === 1)!.instruction);
    expect(first).toMatchObject({ number: 1, total: 3, isFirst: true, isLast: false });
    expect(stepDisplay(s, 2)).toMatchObject({ number: 3, isLast: true });
  });

  it("carries heat, timer, sensory cue and completion note when present", () => {
    const d = stepDisplay(session(), 1)!;
    expect(d.heat).toBe("Medium heat");
    expect(d.duration).toBe("10 min");
    expect(d.timerLabel).toBe("Simmer base");
    expect(d.cues).toEqual([
      { kind: "visual", label: "Look", text: "Oil gathers at the edges." },
      { kind: "aroma", label: "Smell", text: "The sharp raw smell fades." },
    ]);
    expect(d.completionNote).toMatch(/glossy/);
  });

  it("prefers the estimated time over the timer for duration", () => {
    expect(stepDisplay(session(), 2)!.duration).toBe("About 20 min");
  });

  it("leaves missing metadata null instead of filling it in", () => {
    const d = stepDisplay(session(), 0)!;
    expect(d.heat).toBeNull();
    expect(d.duration).toBeNull();
    expect(d.timerLabel).toBeNull();
    expect(d.cues).toEqual([]);
    expect(d.safetyNote).toBeNull();
    expect(d.preparationNotes).toBeNull();
  });

  it("lists step ingredients scaled to the session's servings", () => {
    expect(stepDisplay(session(4), 2)!.ingredients).toMatchObject([
      {
        lineId: "demo-rice",
        name: "Long-grain rice",
        preparation: "rinsed",
        quantity: "400 g",
        portion: "all",
        alsoInSteps: [1],
      },
    ]);
    expect(stepDisplay(session(8), 2)!.ingredients[0].quantity).toBe("800 g");
    expect(stepDisplay(session(4), 1)!.ingredients.map((i) => i.quantity)).toEqual([
      "70 g",
      "To taste",
    ]);
  });

  it("returns null for a step that doesn't exist", () => {
    expect(stepDisplay(session(), 9)).toBeNull();
  });

  it("formats long durations", () => {
    const s = session();
    const long = { ...s, steps: [{ ...s.steps[0], estimatedMinutes: 95 }] };
    expect(stepDisplay(long, 0)!.duration).toBe("About 1 hr 35 min");
  });
});
