import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { startCookingIfReady } from "../../features/recipes/start-cooking";
import {
  emptyRecord,
  evaluateCookingReadiness,
  withEntry,
  withSubstitution,
  type KitchenCheckEntry,
  type KitchenCheckRecord,
} from "./kitchen-check";
import { recipeSchema, type Recipe } from "./recipe-schema";

const recipe = recipeSchema.parse(seedJson);
const names: Record<string, string> = {
  "demo:long-grain-rice": "Long-grain rice",
  "demo:tomato-paste": "Tomato paste",
  "demo:tomato-puree": "Tomato puree",
  "demo:salt": "Salt",
  "demo:plantain": "Plantain",
};
const have = (qty: string, unit: string | null): KitchenCheckEntry => ({
  have: true,
  qtyText: qty,
  unit,
});
const none: KitchenCheckEntry = { have: false, qtyText: "", unit: null };

function record(
  entries: Record<string, KitchenCheckEntry>,
  subs: Record<string, string> = {},
  servings = 4,
): KitchenCheckRecord {
  return { ...emptyRecord(recipe, servings, 1), entries, substitutions: subs };
}
const evalR = (r: KitchenCheckRecord | null, opts: { recipe?: Recipe; servings?: number } = {}) =>
  evaluateCookingReadiness({
    recipe: opts.recipe ?? recipe,
    servings: opts.servings ?? 4,
    record: r,
    ingredientNames: names,
  });

const allCovered = {
  "demo-rice": have("400", "g"),
  "demo-tomato-paste": have("70", "g"),
};

/** Clone with a garnish line that the recipe says cannot be omitted. */
function recipeWith(patch: (r: Recipe) => void): Recipe {
  const copy = JSON.parse(JSON.stringify(recipe)) as Recipe;
  patch(copy);
  return copy;
}

describe("evaluateCookingReadiness", () => {
  it("is NOT_CHECKED before the cook answers, and never READY", () => {
    for (const r of [null, record({})]) {
      const result = evalR(r);
      expect(result.status).toBe("NOT_CHECKED");
      expect(result.canStartCooking).toBe(false);
      expect(result.nextAction).toBe("check-ingredients");
    }
  });

  it("stays NOT_CHECKED when only some required lines are answered", () => {
    const result = evalR(record({ "demo-rice": have("400", "g") }));
    expect(result.status).toBe("NOT_CHECKED");
    expect(result.unchecked.map((r) => r.lineId)).toEqual(["demo-tomato-paste"]);
  });

  it("is READY when every required ingredient is satisfied", () => {
    const result = evalR(record(allCovered));
    expect(result.status).toBe("READY");
    expect(result.canStartCooking).toBe(true);
    expect(result.blockedReason).toBeNull();
    expect(result.nextAction).toBe("start");
  });

  it("is NEEDS_ATTENTION for a missing required ingredient with no alternative", () => {
    const result = evalR(record({ ...allCovered, "demo-rice": none }));
    expect(result.status).toBe("NEEDS_ATTENTION");
    expect(result.canStartCooking).toBe(false);
    expect(result.blockingMissing.map((r) => r.lineId)).toEqual(["demo-rice"]);
    expect(result.nextAction).toBe("shop");
    expect(result.explanations.join(" ")).toMatch(/no approved alternative/);
  });

  it("reports insufficient quantities with the shortfall", () => {
    const result = evalR(record({ ...allCovered, "demo-rice": have("250", "g") }));
    expect(result.status).toBe("NEEDS_ATTENTION");
    expect(result.insufficient.map((r) => r.lineId)).toEqual(["demo-rice"]);
    expect(result.explanations.join(" ")).toMatch(/150 g short/);
  });

  it("does not block on a missing optional ingredient and explains the omission", () => {
    const result = evalR(record({ ...allCovered, "demo-salt": none }));
    expect(result.status).toBe("READY");
    expect(result.nonBlockingMissing.map((r) => r.lineId)).toEqual(["demo-salt"]);
    expect(result.explanations.join(" ")).toMatch(/Salt: optional, fine to leave out/);
  });

  it("offers an approved alternative as ALTERNATIVE_REVIEW until it is chosen", () => {
    const before = evalR(record({ ...allCovered, "demo-tomato-paste": none }));
    expect(before.status).toBe("ALTERNATIVE_REVIEW");
    expect(before.canStartCooking).toBe(false);
    expect(before.nextAction).toBe("review-alternatives");
    expect(before.alternativesAvailable.map((r) => r.lineId)).toEqual(["demo-tomato-paste"]);
    expect(before.explanations.join(" ")).toMatch(/Approved alternative: Tomato puree/);

    const chosen = withSubstitution(
      record({ ...allCovered, "demo-tomato-paste": none }),
      recipe,
      "demo-tomato-paste",
      "demo:tomato-puree",
      2,
    );
    const after = evalR(chosen);
    expect(after.status).toBe("READY");
    expect(after.substitutionsApplied.map((r) => r.lineId)).toEqual(["demo-tomato-paste"]);
  });

  it("ignores an unapproved substitute, even if one is stored", () => {
    const forged = record(
      { ...allCovered, "demo-tomato-paste": none },
      { "demo-tomato-paste": "demo:ketchup" },
    );
    const result = evalR(forged);
    expect(result.canStartCooking).toBe(false);
    expect(result.status).toBe("ALTERNATIVE_REVIEW");
    // Selection helper refuses it outright too.
    const refused = withSubstitution(record({}), recipe, "demo-tomato-paste", "demo:ketchup", 2);
    expect(refused.substitutions).toEqual({});
  });

  it("allows omitting a garnish when the recipe permits it", () => {
    const result = evalR(record({ ...allCovered, "demo-plantain": none }));
    expect(result.status).toBe("READY");
    expect(result.nonBlockingMissing.map((r) => r.lineId)).toEqual(["demo-plantain"]);
  });

  it("blocks on a missing garnish the recipe says cannot be omitted", () => {
    const strict = recipeWith((r) => {
      r.ingredients.find((l) => l.id === "demo-plantain")!.garnishRequired = true;
    });
    const entries = { ...allCovered, "demo-plantain": none };
    expect(evalR(record(entries), { recipe: strict }).status).toBe("NEEDS_ATTENTION");
    const unchecked = evalR(record(allCovered), { recipe: strict });
    expect(unchecked.status).toBe("NOT_CHECKED");
    const ok = evalR(record({ ...allCovered, "demo-plantain": have("2", "piece") }), {
      recipe: strict,
    });
    expect(ok.status).toBe("READY");
  });

  it("requires review when units can't be compared safely", () => {
    const result = evalR(record({ ...allCovered, "demo-rice": have("2", "cup") }));
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.canStartCooking).toBe(false);
    expect(result.nextAction).toBe("review-amounts");
    expect(result.unresolved.map((r) => r.lineId)).toEqual(["demo-rice"]);
  });

  it("requires review for invalid typed amounts", () => {
    const result = evalR(record({ ...allCovered, "demo-rice": have("lots", "g") }));
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.canStartCooking).toBe(false);
  });

  it("never reports READY for invalid recipe data", () => {
    const broken = recipeWith((r) => {
      (r.ingredients[0] as { quantity: number | null }).quantity = -5;
    });
    const result = evalR(record(allCovered), { recipe: broken });
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.canStartCooking).toBe(false);
    expect(result.blockedReason).toMatch(/failed validation/);

    const noRole = recipeWith((r) => {
      (r.ingredients[0] as { role: string }).role = "mystery";
    });
    expect(evalR(record(allCovered), { recipe: noRole }).canStartCooking).toBe(false);
  });

  it("never reports READY for a recipe with no ingredients", () => {
    const empty = recipeWith((r) => {
      r.ingredients = [];
    });
    expect(evalR(null, { recipe: empty }).status).toBe("REVIEW_REQUIRED");
  });
});

describe("readiness changes", () => {
  it("re-evaluates against the selected servings", () => {
    // 400 g rice covers 4 servings but not 6 (600 g).
    const entries = { ...allCovered, "demo-tomato-paste": have("200", "g") };
    expect(evalR(record(entries, {}, 4), { servings: 4 }).status).toBe("READY");
    // Different serving count is a different check context: unanswered.
    expect(evalR(null, { servings: 6 }).status).toBe("NOT_CHECKED");
    // Same answers applied at 6 servings are now short.
    const at6 = evalR(record(entries, {}, 6), { servings: 6 });
    expect(at6.status).toBe("NEEDS_ATTENTION");
    expect(at6.explanations.join(" ")).toMatch(/need 600 g, have 400 g/);
  });

  it("moves blocked → ready as the cook enters more rice", () => {
    let r = record({ ...allCovered, "demo-rice": have("100", "g") });
    expect(evalR(r).status).toBe("NEEDS_ATTENTION");
    r = withEntry(r, "demo-rice", have("400", "g"), 2);
    expect(evalR(r).status).toBe("READY");
  });

  it("moves ready → blocked when an ingredient is used up or a swap is undone", () => {
    let r = record(allCovered);
    expect(evalR(r).canStartCooking).toBe(true);
    r = withEntry(r, "demo-rice", none, 2);
    expect(evalR(r).canStartCooking).toBe(false);

    let swapped = withSubstitution(
      record({ ...allCovered, "demo-tomato-paste": none }),
      recipe,
      "demo-tomato-paste",
      "demo:tomato-puree",
      2,
    );
    expect(evalR(swapped).canStartCooking).toBe(true);
    swapped = withSubstitution(swapped, recipe, "demo-tomato-paste", null, 3);
    expect(evalR(swapped).status).toBe("ALTERNATIVE_REVIEW");
  });
});

describe("startCookingIfReady", () => {
  it("refuses without stored answers, whatever the UI claims", async () => {
    const result = await startCookingIfReady({
      recipe,
      servings: 4,
      ingredientNames: names,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason !== "conflict")
      expect(result.readiness?.status).toBe("NOT_CHECKED");
  });
});
