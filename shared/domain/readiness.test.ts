import { describe, expect, it } from "vitest";
import { recipeSchema, type Recipe } from "./recipe-schema";
import { scaleRecipe } from "./scaling";
import {
  applySubstitute,
  evaluateIngredientRequirement,
  evaluateReadiness,
  evaluateRecipeReadiness,
} from "./readiness";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe = recipeSchema.parse(seedJson);
const lines = () => scaleRecipe(recipe, 4);

describe("evaluateReadiness (legacy adapter)", () => {
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

  it("falls back to the boolean flag on unit mismatch when configured for legacy compatibility", () => {
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

describe("Phase 15: Ingredient Requirement Rules & Readiness", () => {
  it("satisfies required ingredients when sufficient matching quantity is on hand", () => {
    const res = evaluateIngredientRequirement(lines()[0], {
      ingredientId: "demo-rice",
      have: true,
      haveQty: 500,
      unit: "g",
    });

    expect(res.satisfied).toBe(true);
    expect(res.missing).toBe(false);
    expect(res.insufficient).toBe(false);
    expect(res.isBlocking).toBe(false);
    expect(res.status).toBe("satisfied");
    expect(res.shortageQuantity).toBeNull();
  });

  it("satisfies required ingredients via compatible unit conversion (kg -> g)", () => {
    const res = evaluateIngredientRequirement(lines()[0], {
      ingredientId: "demo-rice",
      have: true,
      haveQty: 0.5,
      unit: "kg",
    });

    expect(res.satisfied).toBe(true);
    expect(res.availableQuantity).toBe(500);
    expect(res.availableUnit).toBe("g");
    expect(res.status).toBe("satisfied");
  });

  it("detects missing required ingredients and blocks cooking readiness", () => {
    const res = evaluateIngredientRequirement(lines()[0], {
      ingredientId: "demo-rice",
      have: false,
    });

    expect(res.satisfied).toBe(false);
    expect(res.missing).toBe(true);
    expect(res.isBlocking).toBe(true);
    expect(res.status).toBe("missing");
    expect(res.shortageQuantity).toBe(400);
  });

  it("calculates exact shortage quantity on insufficient available quantity", () => {
    // Requires 400g, user has 250g -> shortage 150g
    const res = evaluateIngredientRequirement(lines()[0], {
      ingredientId: "demo-rice",
      have: true,
      haveQty: 250,
      unit: "g",
    });

    expect(res.satisfied).toBe(false);
    expect(res.insufficient).toBe(true);
    expect(res.shortageQuantity).toBe(150);
    expect(res.shortageUnit).toBe("g");
    expect(res.isBlocking).toBe(true);
    expect(res.status).toBe("insufficient");
  });

  it("does not block cooking readiness when optional ingredients are missing", () => {
    const saltLine = lines().find((l) => l.ingredientId === "demo:salt")!;
    const res = evaluateIngredientRequirement(saltLine, {
      ingredientId: "demo-salt",
      have: false,
    });

    expect(res.satisfied).toBe(false);
    expect(res.missing).toBe(true);
    expect(res.isBlocking).toBe(false);
    expect(res.status).toBe("missing");
  });

  it("satisfies requirement when an approved substitution is selected and preserves original requirement", () => {
    const pasteLine = lines().find((l) => l.ingredientId === "demo:tomato-paste")!;
    const res = evaluateIngredientRequirement(
      pasteLine,
      { ingredientId: "demo-tomato-paste", have: false },
      "demo:tomato-puree",
    );

    expect(res.satisfied).toBe(true);
    expect(res.isBlocking).toBe(false);
    expect(res.status).toBe("substitute-satisfied");
    expect(res.substitutedBy).toEqual({
      ingredientId: "demo:tomato-puree",
      ingredientName: "demo:tomato-puree",
      approved: true,
    });
    // Original requirement data remains preserved
    expect(res.ingredientId).toBe("demo:tomato-paste");
    expect(res.requiredQuantity).toBe(70);
  });

  it("rejects unapproved substitutions and blocks readiness", () => {
    const pasteLine = lines().find((l) => l.ingredientId === "demo:tomato-paste")!;
    const res = evaluateIngredientRequirement(
      pasteLine,
      { ingredientId: "demo-tomato-paste", have: false },
      "demo:ketchup",
    );

    expect(res.satisfied).toBe(false);
    expect(res.isBlocking).toBe(true);
    expect(res.status).toBe("missing");
    expect(res.substitutedBy).toEqual({
      ingredientId: "demo:ketchup",
      ingredientName: "demo:ketchup",
      approved: false,
    });
    expect(res.explanation).toContain("not approved");
  });

  it("handles garnish rules: permits omission by default but blocks when configured as mandatory", () => {
    const plantainLine = lines().find((l) => l.ingredientId === "demo:plantain")!;
    // Standard garnish: omission permitted, does not block
    const standardRes = evaluateIngredientRequirement(plantainLine, {
      ingredientId: "demo-plantain",
      have: false,
    });
    expect(standardRes.satisfied).toBe(false);
    expect(standardRes.isBlocking).toBe(false);

    // Mandatory garnish: explicitly marked garnishRequired = true
    const mandatoryGarnishLine = {
      ...plantainLine,
      garnishRequired: true,
    };
    const mandatoryRes = evaluateIngredientRequirement(mandatoryGarnishLine, {
      ingredientId: "demo-plantain",
      have: false,
    });
    expect(mandatoryRes.satisfied).toBe(false);
    expect(mandatoryRes.isBlocking).toBe(true);
  });

  it("dynamically adjusts required quantities when servings change", () => {
    // 4 base servings require 400g. 8 servings require 800g.
    const report8 = evaluateRecipeReadiness({
      recipe,
      servings: 8,
      pantry: [
        { ingredientId: "demo-rice", have: true, haveQty: 600, unit: "g" },
        { ingredientId: "demo-tomato-paste", have: true, haveQty: 140, unit: "g" },
      ],
    });

    const riceResult = report8.results.find((r) => r.ingredientId === "demo:long-grain-rice")!;
    expect(riceResult.requiredQuantity).toBe(800);
    expect(riceResult.availableQuantity).toBe(600);
    expect(riceResult.shortageQuantity).toBe(200);
    expect(riceResult.insufficient).toBe(true);
    expect(report8.ready).toBe(false);
  });

  it("detects incompatible units without guessing conversions and marks status as unresolved", () => {
    // Rice requires 400g, user reports having 2 cups (no validated density conversion)
    const riceLine = lines()[0];
    const res = evaluateIngredientRequirement(riceLine, {
      ingredientId: "demo-rice",
      have: true,
      haveQty: 2,
      unit: "cup",
    });

    expect(res.satisfied).toBe(false);
    expect(res.status).toBe("unresolved");
    expect(res.unresolvedReason).toBe("incompatible-units");
    expect(res.needsConfirmation).toBe(true);
    expect(res.isBlocking).toBe(true);
    expect(res.explanation).toContain("Incompatible units");
  });

  it("safely handles invalid or corrupt ingredient data without declaring ready", () => {
    const corruptLine = {
      ...lines()[0],
      scaledQuantity: -50,
      quantity: -50,
    };

    const res = evaluateIngredientRequirement(corruptLine, {
      ingredientId: "demo-rice",
      have: true,
      haveQty: 100,
      unit: "g",
    });

    expect(res.satisfied).toBe(false);
    expect(res.status).toBe("unresolved");
    expect(res.unresolvedReason).toBe("invalid-data");
    expect(res.isBlocking).toBe(true);
  });

  it("requires confirmation when quantity comparison is unverified in strict mode", () => {
    const riceLine = lines()[0];
    // Cook claims 'have: true', but didn't provide specific measured quantity
    const res = evaluateIngredientRequirement(
      riceLine,
      {
        ingredientId: "demo-rice",
        have: true,
      },
      undefined,
      { strictQuantities: true },
    );

    expect(res.status).toBe("unresolved");
    expect(res.unresolvedReason).toBe("unverified-quantity");
    expect(res.needsConfirmation).toBe(true);
    expect(res.isBlocking).toBe(true);
  });

  it("produces structured human-readable failure explanations for blocking issues", () => {
    const report = evaluateRecipeReadiness({
      recipe,
      servings: 4,
      pantry: [
        { ingredientId: "demo-rice", have: true, haveQty: 250, unit: "g" },
        // demo-tomato-paste is missing entirely
      ],
      options: {
        ingredientNames: new Map([
          ["demo:long-grain-rice", "Long-grain rice"],
          ["demo:tomato-paste", "Tomato paste"],
        ]),
      },
    });

    expect(report.ready).toBe(false);
    expect(report.blockingFailureCount).toBe(2);
    expect(report.failureReasons.length).toBe(2);

    expect(report.failureReasons[0]).toContain("Long-grain rice: Insufficient quantity");
    expect(report.failureReasons[0]).toContain("short 150 g");
    expect(report.failureReasons[1]).toContain("Tomato paste: Missing substitutable ingredient");
    expect(report.failureReasons[1]).toContain("Approved alternatives");
  });
});
