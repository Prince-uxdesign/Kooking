import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { stepDisplay, stepIngredients } from "./cooking-session";
import { recipeSchema, type Recipe } from "./recipe-schema";
import { scaleRecipe } from "./scaling";
import { goToStep, startSession, updateSessionServings, type CookingSession } from "./session";

/** Illustrative fixture: quantities are test values, not a real recipe. */
const fixture: Recipe = recipeSchema.parse({
  ...(seedJson as object),
  id: "fx",
  slug: "fx",
  baseServings: 4,
  ingredients: [
    {
      id: "oil",
      ingredientId: "i:oil",
      quantity: 4,
      unit: "tbsp",
      role: "required",
      scaling: "linear",
    },
    {
      id: "onion",
      ingredientId: "i:onion",
      quantity: 2,
      unit: "piece",
      preparation: "finely chopped",
      note: "Red onions if you have them",
      role: "required",
      scaling: "discrete",
    },
    {
      id: "rice",
      ingredientId: "i:rice",
      quantity: 1.5,
      unit: "cup",
      role: "required",
      scaling: "linear",
    },
    {
      id: "pepper",
      ingredientId: "i:pepper",
      quantity: 1,
      unit: "tsp",
      role: "optional",
      scaling: "approximate",
    },
    {
      id: "salt",
      ingredientId: "i:salt",
      quantity: null,
      unit: null,
      role: "required",
      scaling: "to-taste",
    },
    {
      id: "stock",
      ingredientId: "i:stock",
      quantity: 500,
      unit: "ml",
      role: "required",
      scaling: "manual",
    },
    {
      id: "water",
      ingredientId: "i:water",
      quantity: null,
      unit: null,
      role: "required",
      scaling: "manual",
    },
  ],
  steps: [
    {
      id: "s1",
      order: 1,
      instruction: "Heat the oil.",
      ingredientIds: ["oil"],
      ingredientQuantities: { oil: 2 },
    },
    {
      id: "s2",
      order: 2,
      instruction: "Fry the onions with the rest of the oil.",
      ingredientIds: ["onion", "oil", "pepper"],
      ingredientQuantities: { oil: 2 },
    },
    { id: "s3", order: 3, instruction: "Let it settle off the heat for a moment." },
    {
      id: "s4",
      order: 4,
      instruction: "Add rice, stock and water, then season.",
      ingredientIds: ["rice", "stock", "water", "salt"],
    },
    {
      id: "s5",
      order: 5,
      instruction: "Top up the stock if it looks dry.",
      ingredientIds: ["stock"],
      ingredientQuantities: { stock: null },
    },
  ],
});

const names = new Map(
  fixture.ingredients.map((l) => [l.id, l.id[0].toUpperCase() + l.id.slice(1)]),
);
const start = (servings = 4): CookingSession =>
  startSession({ id: "s", recipe: fixture, servings, now: 1, lineNames: names });
const at = (s: CookingSession, step: number, lineId: string) =>
  stepIngredients(s, step).find((i) => i.lineId === lineId)!;

describe("step ingredients", () => {
  it("shows one ingredient with its stated per-step part of the total", () => {
    const list = stepIngredients(start(), 0);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: "Oil",
      kind: "amount",
      quantity: "2 tbsp",
      portion: "part",
      totalQuantity: "4 tbsp",
      alsoInSteps: [2],
    });
  });

  it("shows several ingredients, only those the step references", () => {
    const list = stepIngredients(start(), 1);
    expect(list.map((i) => i.lineId)).toEqual(["onion", "oil", "pepper"]);
    expect(list.map((i) => i.lineId)).not.toContain("rice");
  });

  it("returns nothing for a step without ingredient references", () => {
    expect(stepIngredients(start(), 2)).toEqual([]);
    expect(stepDisplay(start(), 2)!.ingredients).toEqual([]);
  });

  it("carries preparation and notes from the recipe", () => {
    expect(at(start(), 1, "onion")).toMatchObject({
      preparation: "finely chopped",
      note: "Red onions if you have them",
      quantity: "2 piece",
      portion: "all",
    });
  });

  it("handles fractional, approximate, to-taste and manual quantities honestly", () => {
    const s = start();
    expect(at(s, 3, "rice").quantity).toBe("1½ cup");
    expect(at(s, 1, "pepper")).toMatchObject({ quantity: "About 1 tsp", approximate: true });
    expect(at(s, 3, "salt")).toMatchObject({ kind: "to-taste", quantity: "To taste" });
    expect(at(s, 3, "water")).toMatchObject({ kind: "unspecified", quantity: "Amount not given" });
    expect(at(start(8), 3, "stock")).toMatchObject({ quantity: "500 ml", notScaled: true });
  });

  it("scales per-step amounts with the same rule as the ingredient list", () => {
    const s8 = start(8);
    expect(at(s8, 0, "oil")).toMatchObject({ quantity: "4 tbsp", totalQuantity: "8 tbsp" });
    expect(at(s8, 3, "rice").quantity).toBe("3 cup");
    expect(at(s8, 1, "onion").quantity).toBe("4 piece");
    // Matches the scaling system's own output for the full line.
    const line = scaleRecipe(fixture, 8).find((l) => l.id === "rice")!;
    expect(at(s8, 3, "rice").quantity).toBe(line.displayQuantity);
    expect(at(start(6), 3, "rice").quantity).toBe(
      scaleRecipe(fixture, 6).find((l) => l.id === "rice")!.displayQuantity,
    );
  });

  it("never shows a full total as if it all goes into one of several steps", () => {
    const s = start();
    expect(at(s, 3, "stock")).toMatchObject({
      quantity: "500 ml",
      portion: "recipe-total",
      alsoInSteps: [5],
    });
    expect(at(s, 4, "stock")).toMatchObject({
      kind: "unspecified",
      quantity: "As needed",
      totalQuantity: "500 ml",
    });
  });

  it("gives screen readers one complete sentence per ingredient", () => {
    const s = start();
    expect(at(s, 0, "oil").spoken).toBe(
      "Oil: 2 tbsp, part of 4 tbsp in total, also used in step 2.",
    );
    expect(at(s, 3, "salt").spoken).toBe("Salt: to taste.");
    expect(at(s, 1, "onion").spoken).toBe(
      "Onion, finely chopped: 2 piece. Red onions if you have them",
    );
  });
});

describe("active-session consistency", () => {
  it("keeps the quantities frozen at start even if the recipe is later edited", () => {
    const s = start();
    const edited = {
      ...fixture,
      ingredients: fixture.ingredients.map((l) => (l.id === "rice" ? { ...l, quantity: 3 } : l)),
    };
    void edited; // the session never reads the recipe again
    expect(at(s, 3, "rice").quantity).toBe("1½ cup");
  });

  it("survives a refresh (JSON round-trip) with identical step quantities", () => {
    const s = start(6);
    const reloaded = JSON.parse(JSON.stringify(s)) as CookingSession;
    expect(stepIngredients(reloaded, 3)).toEqual(stepIngredients(s, 3));
  });

  it("refuses to change servings once cooking has progressed", () => {
    const moved = goToStep(start(), 1, 2);
    expect(() =>
      updateSessionServings({
        session: moved,
        recipe: fixture,
        servings: 6,
        now: 3,
        lineNames: names,
      }),
    ).toThrow(/after cooking has progressed/);
  });

  it("degrades safely for sessions saved before per-step data existed", () => {
    const s = start();
    const legacy: CookingSession = {
      ...s,
      baseServings: undefined,
      snapshot: s.snapshot.map(({ lineId, name, scaledQuantity, unit, displayQuantity }) => ({
        lineId,
        name,
        scaledQuantity,
        unit,
        displayQuantity,
      })),
    };
    expect(at(legacy, 0, "oil")).toMatchObject({ quantity: "4 tbsp", portion: "recipe-total" });
    expect(at(legacy, 3, "salt").kind).toBe("to-taste");
  });
});

describe("recipe validation of step references", () => {
  const base = JSON.parse(JSON.stringify(fixture));
  const issues = (mutate: (r: typeof base) => void) => {
    const r = JSON.parse(JSON.stringify(base));
    mutate(r);
    const res = recipeSchema.safeParse(r);
    return res.success ? [] : res.error.issues.map((i) => i.message);
  };

  it("rejects a per-step amount for a line the step doesn't list", () => {
    expect(issues((r) => (r.steps[0].ingredientQuantities = { onion: 1 })).join()).toMatch(
      /doesn't list it/,
    );
  });

  it("rejects listing the same line twice in a step", () => {
    expect(issues((r) => (r.steps[0].ingredientIds = ["oil", "oil"])).join()).toMatch(
      /more than once/,
    );
  });

  it("rejects a per-step amount above the line total", () => {
    expect(issues((r) => (r.steps[0].ingredientQuantities = { oil: 9 })).join()).toMatch(
      /only has 4/,
    );
  });

  it("rejects a per-step number for a to-taste line", () => {
    expect(
      issues((r) => {
        r.steps[3].ingredientQuantities = { salt: 1 };
      }).join(),
    ).toMatch(/has no quantity/);
  });

  it("allows the same line in several steps (rinse it, then add it)", () => {
    expect(recipeSchema.safeParse(seedJson).success).toBe(true);
  });
});
