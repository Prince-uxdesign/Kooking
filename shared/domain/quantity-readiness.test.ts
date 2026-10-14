import { describe, expect, it } from "vitest";
import {
  buildKitchenCheckView,
  emptyRecord,
  parseQuantityText,
  withEntry,
  withSubstitution,
  addShortagesToList,
  type KitchenCheckRecord,
} from "./kitchen-check";
import { recipeSchema, type Recipe } from "./recipe-schema";
import { formatQuantity } from "./units";

/** Illustrative fixture only — not a validated recipe. */
function fixture(overrides: Partial<Recipe["ingredients"][number]>[] = []): Recipe {
  const base = {
    id: "fx",
    slug: "fx",
    title: "Fixture",
    categories: ["rice"],
    tags: ["demo"],
    baseServings: 4,
    timeMinutes: { prep: 1, cook: 1, total: 2 },
    equipment: [],
    demo: true,
    ingredients: [
      {
        id: "rice",
        ingredientId: "i:rice",
        quantity: 3,
        unit: "cup",
        role: "required",
        scaling: "linear",
      },
      {
        id: "oil",
        ingredientId: "i:oil",
        quantity: 2,
        unit: "tbsp",
        role: "substitutable",
        scaling: "linear",
        substitutes: ["i:butter"],
      },
      {
        id: "thyme",
        ingredientId: "i:thyme",
        quantity: 1,
        unit: "tsp",
        role: "optional",
        scaling: "linear",
      },
      {
        id: "stock",
        ingredientId: "i:stock",
        quantity: 1,
        unit: "l",
        role: "required",
        scaling: "linear",
      },
    ],
    steps: [{ id: "s1", order: 1, instruction: "Cook it until done and tender." }],
  };
  const raw = JSON.parse(JSON.stringify(base));
  overrides.forEach((o, i) => Object.assign(raw.ingredients[i], o));
  return recipeSchema.parse({ ...seedBase(), ...raw });
}

import seedJson from "../../content/seed/demo-tomato-rice.json";
function seedBase() {
  const { ingredients: _i, steps: _s, ...rest } = seedJson as Record<string, unknown>;
  void _i;
  void _s;
  return rest;
}

const recipe = fixture();
const names = {
  "i:rice": "Rice",
  "i:oil": "Oil",
  "i:butter": "Butter",
  "i:thyme": "Thyme",
  "i:stock": "Stock",
};

const rec = (entries: KitchenCheckRecord["entries"], subs = {}, servings = 4) => ({
  ...emptyRecord(recipe, servings, 1),
  entries,
  substitutions: subs,
});
const row = (r: KitchenCheckRecord, id: string, servings = 4) =>
  buildKitchenCheckView({ recipe, servings, record: r, ingredientNames: names }).rows.find(
    (x) => x.lineId === id,
  )!;
const have = (qty: string, unit: string | null = "cup") => ({ have: true, qtyText: qty, unit });

describe("quantity-aware readiness", () => {
  it("reports required, available, missing and status for 3 cups vs 1 cup", () => {
    const r = row(rec({ rice: have("1") }), "rice");
    expect(r.requiredDisplay).toBe("3 cup");
    expect(r.availableDisplay).toBe("1 cup");
    expect(r.shortageDisplay).toBe("2 cup");
    expect(r.state).toBe("not-enough");
  });

  it("satisfies on exact match and on surplus", () => {
    expect(row(rec({ rice: have("3") }), "rice").state).toBe("have-enough");
    const more = row(rec({ rice: have("5") }), "rice");
    expect(more.state).toBe("have-enough");
    expect(more.shortageDisplay).toBeNull();
  });

  it("treats a reported zero as missing, not as a short quantity", () => {
    const r = row(rec({ rice: have("0") }), "rice");
    expect(r.state).toBe("missing");
    expect(r.shortageDisplay).toBe("3 cup");
  });

  it("keeps unchecked lines unchecked", () => {
    const r = row(rec({}), "rice");
    expect(r.state).toBe("not-checked");
    expect(r.availableDisplay).toBeNull();
  });

  it("handles fractions without float error", () => {
    expect(row(rec({ rice: have("2 1/2") }), "rice").shortageDisplay).toBe("½ cup");
    expect(row(rec({ rice: have("2.5") }), "rice").shortageDisplay).toBe("½ cup");
    // 0.1 + 0.2 style dust must not create a phantom shortage.
    expect(parseQuantityText("0.30000000000000004")).toEqual({ kind: "ok", value: 0.3 });
    expect(parseQuantityText("1/3")).toEqual({ kind: "ok", value: 0.333333333 });
  });

  it("converts only validated pairs and flags the rest for review", () => {
    expect(row(rec({ stock: have("500", "ml") }), "stock").shortageDisplay).toBe("0.5 l");
    expect(row(rec({ stock: have("2", "l") }), "stock").state).toBe("have-enough");
    expect(row(rec({ stock: have("2", "cup") }), "stock").state).toBe("needs-review");
    expect(row(rec({ rice: have("500", "g") }), "rice").state).toBe("needs-review");
    expect(row(rec({ oil: have("6", "tsp") }), "oil").state).toBe("have-enough");
  });

  it("rescales required quantities with servings and leaves the recipe untouched", () => {
    expect(row(rec({}), "rice", 4).requiredQuantity).toBe(3);
    expect(row(rec({}, {}, 6), "rice", 6).requiredQuantity).toBe(4.5);
    expect(recipe.ingredients[0].quantity).toBe(3);
    // Same 3 cups: enough at 4 servings, short at 6.
    const entries = { rice: have("3") };
    expect(row(rec(entries), "rice", 4).state).toBe("have-enough");
    expect(row(rec(entries, {}, 6), "rice", 6).state).toBe("not-enough");
  });

  it("accepts only approved substitutes", () => {
    const ok = withSubstitution(rec({}), recipe, "oil", "i:butter", 2);
    expect(row(ok, "oil").state).toBe("alternative");
    const refused = withSubstitution(rec({}), recipe, "oil", "i:lard", 2);
    expect(refused.substitutions).toEqual({});
  });

  it("does not block on a missing optional ingredient", () => {
    const r = row(rec({ thyme: { have: false, qtyText: "", unit: null } }), "thyme");
    expect(r.state).toBe("optional");
    expect(r.isBlocking).toBe(false);
  });

  it("reports invalid input without a quantity", () => {
    for (const bad of ["abc", "-1", "1/0"]) {
      const r = row(rec({ rice: have(bad) }), "rice");
      expect(r.state).toBe("needs-review");
      expect(r.inputError).toBeTruthy();
      expect(r.availableDisplay).toBeNull();
    }
  });

  it("recalculates summary and shopping data as the amount is edited", () => {
    let r = emptyRecord(recipe, 4, 1);
    r = withEntry(r, "rice", have("1"), 2);
    let v = buildKitchenCheckView({ recipe, servings: 4, record: r, ingredientNames: names });
    expect(v.summary.toShop).toBe(1);
    expect(addShortagesToList([], { recipe, servings: 4, rows: v.rows, now: 1 }).items[0].qty).toBe(
      2,
    );

    r = withEntry(r, "rice", have("3"), 3);
    v = buildKitchenCheckView({ recipe, servings: 4, record: r, ingredientNames: names });
    expect(v.summary.toShop).toBe(0);
    expect(addShortagesToList([], { recipe, servings: 4, rows: v.rows, now: 1 }).items).toEqual([]);
  });
});

describe("quantity formatting", () => {
  it.each([
    [0.5, "cup", "½ cup"],
    [1.5, "cup", "1½ cup"],
    [0.3333333333, "cup", "⅓ cup"],
    [2, "cup", "2 cup"],
    [0.1 + 0.2, "g", "0.3 g"],
    [250, "g", "250 g"],
  ])("formats %s %s", (n, unit, expected) => {
    expect(formatQuantity(n, unit as never)).toBe(expected);
  });
});
