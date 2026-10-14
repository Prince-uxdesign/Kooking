import { describe, expect, it } from "vitest";
import { recipeSchema } from "./recipe-schema";
import { contextualQuantities, scaleRecipe } from "./scaling";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe = recipeSchema.parse(seedJson);

describe("scaleRecipe", () => {
  it("scales the demo rice line for 6 servings", () => {
    const lines = scaleRecipe(recipe, 6);
    const rice = lines.find((l) => l.id === "demo-rice")!;
    expect(rice.scaledQuantity).toBe(600);
    expect(rice.displayQuantity).toBe("600 g");
    expect(rice.requiresManual).toBe(false);
  });

  it("scales discrete garnish to whole pieces", () => {
    const lines = scaleRecipe(recipe, 6);
    const plantain = lines.find((l) => l.id === "demo-plantain")!;
    expect(plantain.scaledQuantity).toBe(3);
  });

  it("leaves to-taste lines unscalled", () => {
    const lines = scaleRecipe(recipe, 8);
    const salt = lines.find((l) => l.id === "demo-salt")!;
    expect(salt.scaledQuantity).toBeNull();
    expect(salt.displayQuantity).toBe("to taste");
  });

  it("clamps servings to the stepper range", () => {
    expect(scaleRecipe(recipe, 0).find((l) => l.id === "demo-rice")!.scaledQuantity).toBe(100);
    expect(scaleRecipe(recipe, 99).find((l) => l.id === "demo-rice")!.scaledQuantity).toBe(1200);
  });

  it("never touches timers or instructions", () => {
    scaleRecipe(recipe, 6);
    expect(recipe.steps[1].timer?.durationSeconds).toBe(600);
    expect(recipe.steps[1].instruction).toContain("Simmer");
  });
});

describe("contextualQuantities", () => {
  it("returns only the current step's lines", () => {
    const lines = scaleRecipe(recipe, 4);
    const step2 = contextualQuantities(lines, ["demo-tomato-paste", "demo-salt"]);
    expect(step2.map((l) => l.id).sort()).toEqual(["demo-salt", "demo-tomato-paste"]);
  });
});
