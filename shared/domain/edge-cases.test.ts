import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { createCookingSession, resolveSession, type CatalogEntry } from "./cooking-session";
import { evaluateCookingReadiness, resolveServings } from "./kitchen-check";
import { evaluateRecipeReadiness } from "./readiness";
import { recipeSchema, validateRecipe, type Recipe } from "./recipe-schema";
import { calculateScalingRatio, clampServings, scaleRecipe } from "./scaling";
import { addSessionTimer, rehydrateSession, startSession, transitionSession } from "./session";
import { mergeRecipeNeeds, type RecipeNeed } from "./shopping";
import { isExpired, remainingMs, settleTimers, TimerError } from "./timers";
import { convertUnitQuantity, formatQuantity, parseQuantityText, scaleAmount } from "./units";

const getBaseRecipe = (): Recipe => JSON.parse(JSON.stringify(seedJson));

describe("Phase 37: Error Handling and Edge Cases", () => {
  /* ------------------------------------------------------------------ */
  /* A. Recipe Data Validation Edge Cases                               */
  /* ------------------------------------------------------------------ */
  describe("A. Recipe Data Validation", () => {
    it("rejects duplicate substitutes on an ingredient line", () => {
      const recipe = getBaseRecipe();
      recipe.ingredients[1].substitutes = ["demo:tomato-puree", "demo:tomato-puree"];
      const res = validateRecipe(recipe);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e) => e.includes("cannot contain duplicate references"))).toBe(
          true,
        );
      }
    });

    it("rejects empty or whitespace-only substitute names", () => {
      const recipe = getBaseRecipe();
      recipe.ingredients[1].substitutes = ["   "];
      const res = validateRecipe(recipe);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e) => e.includes("cannot be empty or whitespace"))).toBe(true);
      }
    });

    it("rejects step instructions that are only whitespace", () => {
      const recipe = getBaseRecipe();
      recipe.steps[0].instruction = "     ";
      const res = validateRecipe(recipe);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e) => e.includes("instruction cannot be empty"))).toBe(true);
      }
    });

    it("rejects recipe without any steps", () => {
      const recipe = getBaseRecipe();
      recipe.steps = [];
      const res = validateRecipe(recipe);
      expect(res.success).toBe(false);
    });

    it("rejects invalid timer durations (< 5s or > 24 hours)", () => {
      const recipe = getBaseRecipe();
      recipe.steps[1].timer = { durationSeconds: 2 };
      expect(validateRecipe(recipe).success).toBe(false);

      recipe.steps[1].timer = { durationSeconds: 90_000 };
      expect(validateRecipe(recipe).success).toBe(false);
    });

    it("does not fabricate missing instructions to make invalid data valid", () => {
      const broken = { id: "broken-recipe", title: "Incomplete" };
      const res = validateRecipe(broken);
      expect(res.success).toBe(false);
    });
  });

  /* ------------------------------------------------------------------ */
  /* B. Quantity and Serving Edge Cases                                 */
  /* ------------------------------------------------------------------ */
  describe("B. Quantity and Serving Edge Cases", () => {
    it("handles zero, negative, or non-finite quantities defensively in scaleAmount", () => {
      expect(scaleAmount(0, 4, 4, "linear", "g")).toEqual({
        amount: null,
        approximate: false,
        requiresManual: true,
      });

      expect(scaleAmount(-50, 4, 4, "linear", "g")).toEqual({
        amount: null,
        approximate: false,
        requiresManual: true,
      });

      expect(scaleAmount(NaN, 4, 4, "linear", "g")).toEqual({
        amount: null,
        approximate: false,
        requiresManual: true,
      });

      expect(scaleAmount(Infinity, 4, 4, "linear", "g")).toEqual({
        amount: null,
        approximate: false,
        requiresManual: true,
      });
    });

    it("handles zero or non-finite base servings defensively without division by zero", () => {
      expect(scaleAmount(400, 0, 4, "linear", "g")).toEqual({
        amount: 400,
        approximate: false,
        requiresManual: true,
      });

      expect(scaleAmount(400, -2, 4, "linear", "g")).toEqual({
        amount: 400,
        approximate: false,
        requiresManual: true,
      });

      expect(calculateScalingRatio(0, 4)).toBe(1);
      expect(calculateScalingRatio(-4, 4)).toBe(1);
    });

    it("handles unsupported unit conversions by returning null without guessing", () => {
      // Grams never convert to millilitres or cups without verified density
      expect(convertUnitQuantity(100, "g", "ml")).toBeNull();
      expect(convertUnitQuantity(2, "cup", "g")).toBeNull();
      expect(convertUnitQuantity(1, "piece", "kg")).toBeNull();

      // Negative amounts cannot be converted
      expect(convertUnitQuantity(-10, "kg", "g")).toBeNull();
      expect(convertUnitQuantity(NaN, "kg", "g")).toBeNull();

      // Compatible conversions succeed
      expect(convertUnitQuantity(1.5, "kg", "g")).toBe(1500);
      expect(convertUnitQuantity(2000, "ml", "l")).toBe(2);
      expect(convertUnitQuantity(2, "tbsp", "tsp")).toBe(6);
    });

    it("handles to-taste lines honestly with null quantities", () => {
      const scaled = scaleAmount(null, 4, 8, "to-taste", "pinch");
      expect(scaled.amount).toBeNull();
      expect(scaled.requiresManual).toBe(false);
      expect(formatQuantity(null, "pinch")).toBe("to taste (pinch)");
    });

    it("clamps extreme serving counts within safe boundaries", () => {
      expect(clampServings(-5, 1, 12)).toBe(1);
      expect(clampServings(0, 1, 12)).toBe(1);
      expect(clampServings(999, 1, 12)).toBe(12);
      expect(clampServings(NaN, 1, 12)).toBe(1);

      const resolvedInvalid = resolveServings("9999", { baseServings: 4 });
      expect(resolvedInvalid.servings).toBe(4);
      expect(resolvedInvalid.adjusted).toBe(true);

      const resolvedClamped = resolveServings("999", { baseServings: 4 });
      expect(resolvedClamped.servings).toBe(12);
      expect(resolvedClamped.adjusted).toBe(true);
    });

    it("parses user-entered quantity text with robust edge cases", () => {
      expect(parseQuantityText("-5")).toMatchObject({ kind: "invalid" });
      expect(parseQuantityText("abc")).toMatchObject({ kind: "invalid" });
      expect(parseQuantityText("1/0")).toMatchObject({ kind: "invalid" });
      expect(parseQuantityText("10000000")).toMatchObject({ kind: "invalid" });
      expect(parseQuantityText("0")).toEqual({ kind: "ok", value: 0 });
      expect(parseQuantityText("1 1/2")).toEqual({ kind: "ok", value: 1.5 });
      expect(parseQuantityText("½")).toEqual({ kind: "ok", value: 0.5 });
    });
  });

  /* ------------------------------------------------------------------ */
  /* C. Kitchen Check and Shopping List Edge Cases                      */
  /* ------------------------------------------------------------------ */
  describe("C. Kitchen Check and Shopping List", () => {
    it("flags incompatible units as unresolved needs-review and blocks cooking", () => {
      const recipe = getBaseRecipe();
      const report = evaluateRecipeReadiness({
        recipe,
        pantry: [
          // Recipe requires 400 g rice; user enters 2 cups (incompatible)
          { ingredientId: "demo:long-grain-rice", have: true, haveQty: 2, unit: "cup" },
        ],
      });

      const riceRes = report.results.find((r) => r.ingredientId === "demo:long-grain-rice");
      expect(riceRes?.status).toBe("unresolved");
      expect(riceRes?.unresolvedReason).toBe("incompatible-units");
      expect(riceRes?.needsConfirmation).toBe(true);
      expect(report.ready).toBe(false);
    });

    it("distinguishes having enough, having some but not enough, and having none", () => {
      const recipe = getBaseRecipe();
      // Required: 400 g rice
      const enough = evaluateRecipeReadiness({
        recipe,
        pantry: [{ ingredientId: "demo:long-grain-rice", have: true, haveQty: 500, unit: "g" }],
      });
      expect(enough.results.find((r) => r.ingredientId === "demo:long-grain-rice")?.status).toBe(
        "satisfied",
      );

      const short = evaluateRecipeReadiness({
        recipe,
        pantry: [{ ingredientId: "demo:long-grain-rice", have: true, haveQty: 250, unit: "g" }],
      });
      const shortResult = short.results.find((r) => r.ingredientId === "demo:long-grain-rice");
      expect(shortResult?.status).toBe("insufficient");
      expect(shortResult?.shortageQuantity).toBe(150);

      const none = evaluateRecipeReadiness({
        recipe,
        pantry: [{ ingredientId: "demo:long-grain-rice", have: false }],
      });
      expect(none.results.find((r) => r.ingredientId === "demo:long-grain-rice")?.status).toBe(
        "missing",
      );
    });

    it("treats zero reported amount as none on hand", () => {
      const recipe = getBaseRecipe();
      const report = evaluateRecipeReadiness({
        recipe,
        pantry: [{ ingredientId: "demo:long-grain-rice", have: true, haveQty: 0, unit: "g" }],
      });
      expect(report.results.find((r) => r.ingredientId === "demo:long-grain-rice")?.status).toBe(
        "missing",
      );
    });

    it("allows optional ingredient to be missing without blocking cooking", () => {
      const recipe = getBaseRecipe();
      // Plantain is optional in demo recipe
      const report = evaluateRecipeReadiness({
        recipe,
        pantry: [
          { ingredientId: "demo:long-grain-rice", have: true, haveQty: 400, unit: "g" },
          { ingredientId: "demo:tomato-paste", have: true, haveQty: 100, unit: "g" },
          { ingredientId: "demo:salt", have: true },
          { ingredientId: "demo:plantain", have: false },
        ],
      });
      expect(report.ready).toBe(true);
      expect(report.omittedOptional.length).toBeGreaterThan(0);
    });

    it("never marks cooking ready when a blocking requirement is unresolved", () => {
      const recipe = getBaseRecipe();
      const check = evaluateCookingReadiness({
        recipe,
        servings: 4,
        record: null,
        ingredientNames: {},
      });
      expect(check.canStartCooking).toBe(false);
      expect(check.status).toBe("NOT_CHECKED");
    });

    it("is idempotent when adding the same recipe to shopping list multiple times", () => {
      const needs: RecipeNeed[] = [
        {
          lineId: "demo-rice",
          ingredientId: "demo:long-grain-rice",
          name: "Long-grain rice",
          qty: 400,
          unit: "g",
          requiredQty: 400,
          availableQty: 0,
          needsClarification: false,
        },
      ];

      // First addition
      const first = mergeRecipeNeeds([], {
        recipeId: "demo-recipe",
        recipeSlug: "demo-recipe",
        servings: 4,
        needs,
        resolvedLineIds: [],
        now: 1000,
      });
      expect(first.added).toBe(1);
      expect(first.items).toHaveLength(1);

      // Repeated addition with same needs
      const second = mergeRecipeNeeds(first.items, {
        recipeId: "demo-recipe",
        recipeSlug: "demo-recipe",
        servings: 4,
        needs,
        resolvedLineIds: [],
        now: 2000,
      });
      expect(second.added).toBe(0);
      expect(second.unchanged).toBe(1);
      expect(second.items).toHaveLength(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /* D. Cooking Session and Timers Edge Cases                           */
  /* ------------------------------------------------------------------ */
  describe("D. Cooking Session and Timers", () => {
    const catalog: Record<string, CatalogEntry> = {
      "demo-tomato-rice": {
        title: "Demo Tomato Rice",
        slug: "demo-tomato-rice",
        contentVersion: 1,
      },
    };

    it("clamps out-of-range step index and flags stepRepaired", () => {
      const recipe = getBaseRecipe();
      const lineNames = new Map(recipe.ingredients.map((l) => [l.id, l.id]));
      const session = startSession({
        id: "s1",
        recipe,
        servings: 4,
        now: 1000,
        lineNames,
      });

      // Force invalid step index
      const corrupted = { ...session, currentStepIndex: 999 };
      const resolved = resolveSession(corrupted, catalog, 1000);

      expect(resolved.kind).toBe("cooking");
      if (resolved.kind === "cooking") {
        expect(resolved.stepRepaired).toBe(true);
        expect(resolved.stepIndex).toBe(recipe.steps.length - 1);
      }
    });

    it("continues from snapshot when recipe is deleted or missing from catalog", () => {
      const recipe = getBaseRecipe();
      const lineNames = new Map(recipe.ingredients.map((l) => [l.id, l.id]));
      const session = startSession({
        id: "s2",
        recipe,
        servings: 4,
        now: 1000,
        lineNames,
      });

      // Empty catalog (recipe removed)
      const resolved = resolveSession(session, {}, 1000);
      expect(resolved.kind).toBe("cooking");
      if (resolved.kind === "cooking") {
        expect(resolved.recipeMissing).toBe(true);
        expect(resolved.step.id).toBe(recipe.steps[0].id);
      }
    });

    it("rejects invalid timer durations in addSessionTimer", () => {
      const recipe = getBaseRecipe();
      const lineNames = new Map(recipe.ingredients.map((l) => [l.id, l.id]));
      const session = startSession({
        id: "s3",
        recipe,
        servings: 4,
        now: 1000,
        lineNames,
      });

      expect(() => addSessionTimer(session, 2, 1000)).toThrow(TimerError);
      expect(() => addSessionTimer(session, 100_000, 1000)).toThrow(TimerError);
      expect(() => addSessionTimer(session, NaN, 1000)).toThrow(TimerError);
    });

    it("settles timers that expired while the application was closed/suspended", () => {
      const recipe = getBaseRecipe();
      const lineNames = new Map(recipe.ingredients.map((l) => [l.id, l.id]));
      const session = startSession({
        id: "s4",
        recipe,
        servings: 4,
        now: 1000,
        lineNames,
      });

      const withTimer = addSessionTimer(session, 30, 1000).session;
      const runningTimer = withTimer.timers[withTimer.timers.length - 1];

      // Time advances 60 seconds later (past the 30s duration)
      expect(isExpired(runningTimer, 61_000)).toBe(true);
      expect(remainingMs(runningTimer, 61_000)).toBe(0);

      const { timers: settled, finished } = settleTimers(withTimer.timers, 61_000);
      expect(finished).toContain(runningTimer.id);
      expect(settled.find((t) => t.id === runningTimer.id)?.status).toBe("done");
    });

    it("prevents reopening or reactivating completed or abandoned sessions", () => {
      const recipe = getBaseRecipe();
      const lineNames = new Map(recipe.ingredients.map((l) => [l.id, l.id]));
      const session = startSession({
        id: "s5",
        recipe,
        servings: 4,
        now: 1000,
        lineNames,
      });

      const completed = transitionSession(session, "complete", 2000);
      const rehydrated = rehydrateSession(completed, 3000);
      expect(rehydrated.status).toBe("completed");

      const resolved = resolveSession(completed, catalog, 3000);
      expect(resolved.kind).toBe("completed");
    });
  });
});
