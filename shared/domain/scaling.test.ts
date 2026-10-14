import { describe, expect, it } from "vitest";
import { recipeSchema, type Recipe } from "./recipe-schema";
import {
  calculateScalingRatio,
  clampServings,
  contextualQuantities,
  isRecipeScaled,
  scaleRecipe,
} from "./scaling";
import { startSession, updateSessionServings } from "./session";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe: Recipe = recipeSchema.parse(seedJson);

describe("scaleRecipe — serving adjustments", () => {
  it("scaling to base serving count preserves exact original quantities", () => {
    const lines = scaleRecipe(recipe, recipe.baseServings);
    const rice = lines.find((l) => l.id === "demo-rice")!;
    const tomato = lines.find((l) => l.id === "demo-tomato-paste")!;
    const plantain = lines.find((l) => l.id === "demo-plantain")!;
    const salt = lines.find((l) => l.id === "demo-salt")!;

    expect(rice.scaledQuantity).toBe(400);
    expect(rice.displayQuantity).toBe("400 g");
    expect(tomato.scaledQuantity).toBe(70);
    expect(tomato.displayQuantity).toBe("70 g");
    expect(plantain.scaledQuantity).toBe(2);
    expect(plantain.displayQuantity).toBe("2 piece");
    expect(salt.scaledQuantity).toBeNull();
    expect(salt.displayQuantity).toBe("to taste");
  });

  it("doubles linear quantities when doubling servings (4 -> 8)", () => {
    const lines = scaleRecipe(recipe, 8);
    const rice = lines.find((l) => l.id === "demo-rice")!;
    const tomato = lines.find((l) => l.id === "demo-tomato-paste")!;
    const plantain = lines.find((l) => l.id === "demo-plantain")!;

    expect(rice.scaledQuantity).toBe(800);
    expect(rice.displayQuantity).toBe("800 g");
    expect(tomato.scaledQuantity).toBe(140);
    expect(tomato.displayQuantity).toBe("140 g");
    expect(plantain.scaledQuantity).toBe(4);
  });

  it("halves linear quantities when halving servings (4 -> 2)", () => {
    const lines = scaleRecipe(recipe, 2);
    const rice = lines.find((l) => l.id === "demo-rice")!;
    const tomato = lines.find((l) => l.id === "demo-tomato-paste")!;
    const plantain = lines.find((l) => l.id === "demo-plantain")!;

    expect(rice.scaledQuantity).toBe(200);
    expect(rice.displayQuantity).toBe("200 g");
    expect(tomato.scaledQuantity).toBe(35);
    expect(tomato.displayQuantity).toBe("35 g");
    expect(plantain.scaledQuantity).toBe(1);
  });

  it("handles non-integer scaling factors (4 -> 6, 1.5x factor)", () => {
    const lines = scaleRecipe(recipe, 6);
    const rice = lines.find((l) => l.id === "demo-rice")!;
    const tomato = lines.find((l) => l.id === "demo-tomato-paste")!;
    const plantain = lines.find((l) => l.id === "demo-plantain")!;

    expect(rice.scaledQuantity).toBe(600);
    expect(rice.displayQuantity).toBe("600 g");
    expect(tomato.scaledQuantity).toBe(105);
    expect(tomato.displayQuantity).toBe("105 g");
    expect(plantain.scaledQuantity).toBe(3);
  });

  it("keeps discrete quantities whole with a minimum of 1", () => {
    // 2 pieces scaled down to 1 serving: 2 * 1/4 = 0.5 -> rounded to whole, min 1
    const lines1 = scaleRecipe(recipe, 1);
    const plantain1 = lines1.find((l) => l.id === "demo-plantain")!;
    expect(plantain1.scaledQuantity).toBe(1);
    expect(plantain1.displayQuantity).toBe("1 piece");

    // 2 pieces scaled to 5 servings: 2 * 5/4 = 2.5 -> rounds to 3 pieces
    const lines5 = scaleRecipe(recipe, 5);
    const plantain5 = lines5.find((l) => l.id === "demo-plantain")!;
    expect(plantain5.scaledQuantity).toBe(3);
    expect(plantain5.displayQuantity).toBe("3 piece");
  });

  it("leaves to-taste lines unscaled with null quantities and 'to taste' display", () => {
    for (const s of [1, 2, 6, 8, 12]) {
      const lines = scaleRecipe(recipe, s);
      const salt = lines.find((l) => l.id === "demo-salt")!;
      expect(salt.scaledQuantity).toBeNull();
      expect(salt.displayQuantity).toBe("to taste");
      expect(salt.approximate).toBe(false);
      expect(salt.requiresManual).toBe(false);
    }
  });

  it("handles manual adjustment ingredients by freezing quantity and setting flag", () => {
    const recipeWithManual: Recipe = {
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        {
          id: "manual-spice",
          ingredientId: "demo:salt",
          quantity: 10,
          unit: "g",
          role: "optional",
          scaling: "manual",
          note: "Adjust carefully for batch size",
        },
      ],
    };

    const lines = scaleRecipe(recipeWithManual, 8);
    const manualLine = lines.find((l) => l.id === "manual-spice")!;
    expect(manualLine.scaledQuantity).toBe(10);
    expect(manualLine.requiresManual).toBe(true);
    expect(manualLine.displayQuantity).toBe("10 g");
  });

  it("handles approximate scaling by setting approximate flag", () => {
    const recipeWithApprox: Recipe = {
      ...recipe,
      ingredients: [
        ...recipe.ingredients,
        {
          id: "approx-liquid",
          ingredientId: "demo:salt",
          quantity: 2,
          unit: "cup",
          role: "optional",
          scaling: "approximate",
        },
      ],
    };

    const lines = scaleRecipe(recipeWithApprox, 6);
    const approxLine = lines.find((l) => l.id === "approx-liquid")!;
    expect(approxLine.scaledQuantity).toBe(3);
    expect(approxLine.approximate).toBe(true);
    expect(approxLine.displayQuantity).toBe("3 cup");
  });

  it("prevents cumulative rounding errors under repeated serving changes", () => {
    // Repeated scale operations should always compute from base recipe, not previous results
    const sequence = [6, 2, 8, 3, 10, 4];
    for (const s of sequence) {
      scaleRecipe(recipe, s);
    }

    const finalAtBase = scaleRecipe(recipe, recipe.baseServings);
    const rice = finalAtBase.find((l) => l.id === "demo-rice")!;
    const tomato = finalAtBase.find((l) => l.id === "demo-tomato-paste")!;

    expect(rice.scaledQuantity).toBe(400);
    expect(tomato.scaledQuantity).toBe(70);
  });

  it("never mutates the original recipe object or base ingredient lines", () => {
    const originalRiceQty = recipe.ingredients[0].quantity;
    const originalTomatoQty = recipe.ingredients[1].quantity;

    scaleRecipe(recipe, 8);
    scaleRecipe(recipe, 2);
    scaleRecipe(recipe, 12);

    expect(recipe.ingredients[0].quantity).toBe(originalRiceQty);
    expect(recipe.ingredients[1].quantity).toBe(originalTomatoQty);
    expect(recipe.baseServings).toBe(4);
  });

  it("never alters recipe steps, timers, heat levels, or completion notes", () => {
    scaleRecipe(recipe, 12);
    expect(recipe.steps[1].timer?.durationSeconds).toBe(600);
    expect(recipe.steps[1].heat).toBe("medium");
    expect(recipe.steps[1].instruction).toContain("Simmer");
    expect(recipe.steps[1].sensoryCue).toContain("Oil gathers");
    expect(recipe.steps[2].estimatedMinutes).toBe(20);
  });
});

describe("clampServings & input validation", () => {
  it("clamps non-positive numbers to minimum 1", () => {
    expect(clampServings(0)).toBe(1);
    expect(clampServings(-5)).toBe(1);
    expect(clampServings(-100)).toBe(1);
  });

  it("clamps non-finite values to minimum 1", () => {
    expect(clampServings(NaN)).toBe(1);
    expect(clampServings(Infinity)).toBe(1);
    expect(clampServings(-Infinity)).toBe(1);
  });

  it("rounds floating point serving values to nearest whole integer", () => {
    expect(clampServings(3.8)).toBe(4);
    expect(clampServings(2.1)).toBe(2);
    expect(clampServings(2.5)).toBe(3);
  });

  it("respects custom min and max bounds", () => {
    expect(clampServings(5, 2, 8)).toBe(5);
    expect(clampServings(1, 2, 8)).toBe(2);
    expect(clampServings(10, 2, 8)).toBe(8);
  });
});

describe("calculateScalingRatio and isRecipeScaled", () => {
  it("calculates clean scaling ratios", () => {
    expect(calculateScalingRatio(4, 4)).toBe(1);
    expect(calculateScalingRatio(4, 6)).toBe(1.5);
    expect(calculateScalingRatio(4, 8)).toBe(2);
    expect(calculateScalingRatio(4, 2)).toBe(0.5);
    expect(calculateScalingRatio(4, 5)).toBe(1.25);
  });

  it("detects when a recipe is scaled away from base yield", () => {
    expect(isRecipeScaled(4, 4)).toBe(false);
    expect(isRecipeScaled(4, 6)).toBe(true);
    expect(isRecipeScaled(4, 2)).toBe(true);
  });
});

describe("contextualQuantities", () => {
  it("returns only the lines relevant to the specified step", () => {
    const lines = scaleRecipe(recipe, 4);
    const step2 = contextualQuantities(lines, ["demo-tomato-paste", "demo-salt"]);
    expect(step2.map((l) => l.id).sort()).toEqual(["demo-salt", "demo-tomato-paste"]);
    expect(step2.some((l) => l.id === "demo-rice")).toBe(false);
  });
});

describe("session serving adjustments (cooking mode foundation)", () => {
  const lineNames = new Map([
    ["demo-rice", "Long-grain rice"],
    ["demo-tomato-paste", "Tomato paste"],
    ["demo-salt", "Salt"],
    ["demo-plantain", "Plantain"],
  ]);

  it("allows updating servings explicitly on an active session with fresh snapshots", () => {
    const session = startSession({
      id: "session-1",
      recipe,
      servings: 4,
      now: 1000,
      lineNames,
    });

    expect(session.servings).toBe(4);
    const initialRice = session.snapshot.find((l) => l.lineId === "demo-rice")!;
    expect(initialRice.scaledQuantity).toBe(400);

    const updated = updateSessionServings({
      session,
      recipe,
      servings: 6,
      now: 2000,
      lineNames,
    });

    expect(updated.servings).toBe(6);
    expect(updated.updatedAt).toBe(2000);
    const updatedRice = updated.snapshot.find((l) => l.lineId === "demo-rice")!;
    expect(updatedRice.scaledQuantity).toBe(600);
    expect(updatedRice.displayQuantity).toBe("600 g");
  });

  it("refuses to update servings on a completed session", () => {
    const session = startSession({
      id: "session-2",
      recipe,
      servings: 4,
      now: 1000,
      lineNames,
    });
    session.status = "completed";

    expect(() =>
      updateSessionServings({
        session,
        recipe,
        servings: 6,
        now: 2000,
        lineNames,
      }),
    ).toThrow(/cannot update servings on a completed session/);
  });
});
