import { describe, expect, it } from "vitest";
import { recipeSchema } from "./recipe-schema";
import { scaleRecipe } from "./scaling";
import { applySubstitute, evaluateReadiness } from "./readiness";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe = recipeSchema.parse(seedJson);
const lines = () => scaleRecipe(recipe, 4);

describe("evaluateReadiness", () => {
  it("is ready when everything required is on hand", () => {
    const report = evaluateReadiness(lines(), [
      { ingredientId: "demo-rice", have: true, haveQty: 500, unit: "g" },
      { ingredientId: "demo-tomato-paste", have: true, haveQty: 70, unit: "g" },
      { ingredientId: "demo-salt", have: true },
      { ingredientId: "demo-plantain", have: true, haveQty: 2, unit: "piece" },
    ]);
    expect(report.ready).toBe(true);
    expect(report.missingRequired).toEqual([]);
  });

  it("blocks on short required quantities with the exact shortfall", () => {
    const report = evaluateReadiness(lines(), [
      { ingredientId: "demo-rice", have: true, haveQty: 250, unit: "g" },
      { ingredientId: "demo-tomato-paste", have: true, haveQty: 70, unit: "g" },
    ]);
    expect(report.ready).toBe(false);
    expect(report.missingRequired).toContain("demo-rice");
    expect(report.items.find((i) => i.ingredientId === "demo-rice")!.needQty).toBe(150);
  });

  it("never blocks on optional or garnish lines", () => {
    const report = evaluateReadiness(lines(), [
      { ingredientId: "demo-rice", have: true, haveQty: 400, unit: "g" },
      { ingredientId: "demo-tomato-paste", have: true, haveQty: 70, unit: "g" },
    ]);
    expect(report.ready).toBe(true);
    expect(report.missingOptional.sort()).toEqual(["demo-plantain", "demo-salt"]);
  });

  it("marks required lines need when absent", () => {
    const report = evaluateReadiness(lines(), []);
    expect(report.ready).toBe(false);
    expect(report.missingRequired).toContain("demo-rice");
    expect(report.missingRequired).toContain("demo-tomato-paste");
  });

  it("falls back to the boolean flag on unit mismatch", () => {
    const report = evaluateReadiness(lines(), [
      { ingredientId: "demo-rice", have: true, haveQty: 3, unit: "cup" },
      { ingredientId: "demo-tomato-paste", have: true, haveQty: 70, unit: "g" },
    ]);
    const item = report.items.find((i) => i.ingredientId === "demo-rice")!;
    expect(item.status).toBe("have");
    expect(item.approximate).toBe(true);
  });
});

describe("applySubstitute", () => {
  it("clears a substitutable need on approved swaps only", () => {
    const report = evaluateReadiness(lines(), [
      { ingredientId: "demo-rice", have: true, haveQty: 400, unit: "g" },
    ]);
    expect(report.missingRequired).toContain("demo-tomato-paste");

    const allowed = recipe.ingredients.find((i) => i.id === "demo-tomato-paste")!.substitutes!;
    const cleared = applySubstitute(report, "demo-tomato-paste", allowed[0], allowed);
    expect(cleared.items.find((i) => i.ingredientId === "demo-tomato-paste")!.status).toBe(
      "substitute-ok",
    );
    expect(cleared.ready).toBe(true);

    const rejected = applySubstitute(report, "demo-tomato-paste", "ketchup", allowed);
    expect(rejected.ready).toBe(false);
  });
});
