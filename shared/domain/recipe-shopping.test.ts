import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import {
  addShortagesToList,
  buildKitchenCheckView,
  emptyRecord,
  withEntry,
  withSubstitution,
  type KitchenCheckEntry,
  type KitchenCheckRecord,
} from "./kitchen-check";
import { recipeSchema } from "./recipe-schema";
import {
  createPersonalItem,
  groupByIngredient,
  mergeRecipeNeeds,
  shoppingItemSchema,
  type ShoppingItem,
} from "./shopping";

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

function rec(entries: Record<string, KitchenCheckEntry>, subs = {}, servings = 4) {
  return { ...emptyRecord(recipe, servings, 1), entries, substitutions: subs };
}
function generate(existing: ShoppingItem[], r: KitchenCheckRecord, servings = 4, now = 100) {
  const view = buildKitchenCheckView({ recipe, servings, record: r, ingredientNames: names });
  return addShortagesToList(existing, { recipe, servings, rows: view.rows, now });
}
const byLine = (items: ShoppingItem[], lineId: string) => items.find((i) => i.lineId === lineId);

describe("generating a recipe shopping list", () => {
  it("adds missing ingredients at the full required amount, with references", () => {
    const { items, added } = generate([], rec({ "demo-rice": none }));
    expect(added).toBe(1);
    const rice = byLine(items, "demo-rice")!;
    expect(rice).toMatchObject({
      origin: "recipe",
      recipeId: recipe.id,
      recipeSlug: recipe.slug,
      recipeTitle: recipe.title,
      ingredientId: "demo:long-grain-rice",
      name: "Long-grain rice",
      qty: 400,
      unit: "g",
      requiredQty: 400,
      availableQty: 0,
      servingsContext: 4,
      checked: false,
      needsClarification: false,
      createdAt: 100,
    });
  });

  it("adds only the shortfall for partial quantities, keeping required separate", () => {
    const rice = byLine(generate([], rec({ "demo-rice": have("250", "g") })).items, "demo-rice")!;
    expect(rice.qty).toBe(150);
    expect(rice.requiredQty).toBe(400);
    expect(rice.availableQty).toBe(250);
  });

  it("converts only through validated rules (0.25 kg vs 400 g)", () => {
    const rice = byLine(generate([], rec({ "demo-rice": have("0.25", "kg") })).items, "demo-rice")!;
    expect(rice.qty).toBe(150);
    expect(rice.unit).toBe("g");
  });

  it("adds nothing for exact matches or surplus", () => {
    expect(generate([], rec({ "demo-rice": have("400", "g") })).items).toEqual([]);
    expect(generate([], rec({ "demo-rice": have("900", "g") })).items).toEqual([]);
  });

  it("never adds unchecked ingredients", () => {
    expect(generate([], rec({})).items).toEqual([]);
  });

  it("does not add optional or permitted-garnish lines the cook chose to skip", () => {
    const { items } = generate([], rec({ "demo-salt": none, "demo-plantain": none }));
    expect(items).toEqual([]);
  });

  it("does not add a line covered by an approved substitute", () => {
    const r = withSubstitution(
      rec({ "demo-tomato-paste": none }),
      recipe,
      "demo-tomato-paste",
      "demo:tomato-puree",
      2,
    );
    expect(generate([], r).items).toEqual([]);
  });

  it("treats an unapproved substitute as missing and shops for the original", () => {
    const r = rec({ "demo-tomato-paste": none }, { "demo-tomato-paste": "demo:ketchup" });
    const paste = byLine(generate([], r).items, "demo-tomato-paste")!;
    expect(paste.qty).toBe(70);
    expect(paste.name).toBe("Tomato paste");
  });

  it("flags incompatible units for clarification instead of inventing a quantity", () => {
    const rice = byLine(generate([], rec({ "demo-rice": have("2", "cup") })).items, "demo-rice")!;
    expect(rice.needsClarification).toBe(true);
    expect(rice.qty).toBeNull();
    expect(rice.requiredQty).toBe(400);
    expect(rice.clarification).toMatch(/2 cup.*can't be compared with 400 g/);
  });

  it("flags unreadable typed amounts for clarification", () => {
    const rice = byLine(generate([], rec({ "demo-rice": have("lots", "g") })).items, "demo-rice")!;
    expect(rice.needsClarification).toBe(true);
    expect(rice.clarification).toMatch(/couldn't be read/);
  });

  it("uses the selected servings", () => {
    const rice = byLine(generate([], rec({ "demo-rice": none }, {}, 6), 6).items, "demo-rice")!;
    expect(rice.qty).toBe(600);
    expect(rice.servingsContext).toBe(6);
  });
});

describe("duplicate handling", () => {
  it("repeated generation does not duplicate or double items", () => {
    const r = rec({ "demo-rice": have("250", "g"), "demo-tomato-paste": none });
    const first = generate([], r);
    const second = generate(first.items, r, 4, 200);
    expect(second.items).toHaveLength(2);
    expect(second.added).toBe(0);
    expect(second.unchanged).toBe(2);
    expect(byLine(second.items, "demo-rice")!.qty).toBe(150);
  });

  it("updates the existing item when the shortage changes, keeping createdAt and notes", () => {
    const first = generate([], rec({ "demo-rice": have("100", "g") }));
    const withNote = first.items.map((i) => ({ ...i, notes: "Get the 5kg bag" }));
    const second = generate(withNote, rec({ "demo-rice": have("300", "g") }), 4, 500);
    const rice = byLine(second.items, "demo-rice")!;
    expect(second.updated).toBe(1);
    expect(second.items).toHaveLength(1);
    expect(rice.qty).toBe(100);
    expect(rice.createdAt).toBe(100);
    expect(rice.notes).toBe("Get the 5kg bag");
  });

  it("replaces rather than adds when servings change for the same recipe", () => {
    const at4 = generate([], rec({ "demo-rice": none }));
    const at6 = generate(at4.items, rec({ "demo-rice": none }, {}, 6), 6, 300);
    expect(at6.items).toHaveLength(1);
    expect(byLine(at6.items, "demo-rice")!.qty).toBe(600);
  });

  it("removes unbought items the recipe no longer needs, but keeps bought ones", () => {
    const first = generate([], rec({ "demo-rice": none, "demo-tomato-paste": none }));
    const pasteBought = first.items.map((i) =>
      i.lineId === "demo-tomato-paste" ? { ...i, checked: true } : i,
    );
    const now = rec({ "demo-rice": have("400", "g"), "demo-tomato-paste": have("70", "g") });
    const second = generate(pasteBought, now, 4, 200);
    expect(second.removed).toBe(1);
    expect(byLine(second.items, "demo-rice")).toBeUndefined();
    expect(byLine(second.items, "demo-tomato-paste")!.checked).toBe(true);
  });

  it("preserves a ticked item when the need hasn't grown, unticks it when it has", () => {
    const first = generate([], rec({ "demo-rice": have("200", "g") }));
    const ticked = first.items.map((i) => ({ ...i, checked: true }));
    const same = generate(ticked, rec({ "demo-rice": have("200", "g") }), 4, 200);
    expect(byLine(same.items, "demo-rice")!.checked).toBe(true);
    const grew = generate(ticked, rec({ "demo-rice": have("200", "g") }, {}, 6), 6, 300);
    expect(byLine(grew.items, "demo-rice")!.checked).toBe(false);
  });

  it("never touches personal items or other recipes' items", () => {
    const personal = createPersonalItem({ id: "p1", name: "Bread", now: 1 });
    const other = shoppingItemSchema.parse({
      id: "shop:other:demo-rice",
      origin: "recipe",
      recipeId: "other",
      recipeSlug: "other",
      lineId: "demo-rice",
      ingredientId: "demo:long-grain-rice",
      name: "Long-grain rice",
      unit: "g",
      qty: 300,
      createdAt: 1,
    });
    const { items } = generate([personal, other], rec({ "demo-rice": none }));
    expect(items).toContainEqual(personal);
    expect(items).toContainEqual(other);
    expect(items).toHaveLength(3);
  });

  it("migrates Phase 17 servings-keyed items into one item per line", () => {
    const legacy = shoppingItemSchema.parse({
      id: `shop:${recipe.id}:4:demo-rice`,
      origin: "recipe",
      recipeId: recipe.id,
      recipeSlug: recipe.slug,
      ingredientId: "demo:long-grain-rice",
      name: "Long-grain rice",
      unit: "g",
      qty: 800,
      servingsContext: 4,
      createdAt: 5,
    });
    const { items } = generate([legacy], rec({ "demo-rice": none }));
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(`shop:${recipe.id}:demo-rice`);
    expect(items[0].qty).toBe(400);
    expect(items[0].createdAt).toBe(5);
  });

  it("does not mark anything bought, or change the Kitchen Check record", () => {
    const r = rec({ "demo-rice": none });
    const snapshot = JSON.stringify(r);
    const { items } = generate([], r);
    expect(items.every((i) => !i.checked)).toBe(true);
    expect(JSON.stringify(r)).toBe(snapshot);
    const after = buildKitchenCheckView({ recipe, servings: 4, record: r, ingredientNames: names });
    expect(after.readiness.canStartCooking).toBe(false);
  });

  it("only becomes ready once the cook updates Kitchen Check", () => {
    let r: KitchenCheckRecord = rec({ "demo-rice": none, "demo-tomato-paste": have("70", "g") });
    generate([], r);
    r = withEntry(r, "demo-rice", have("400", "g"), 2);
    const view = buildKitchenCheckView({ recipe, servings: 4, record: r, ingredientNames: names });
    expect(view.readiness.status).toBe("READY");
  });
});

describe("combining across recipes", () => {
  const item = (over: Partial<ShoppingItem>): ShoppingItem =>
    shoppingItemSchema.parse({
      id: `x:${Math.random()}`,
      origin: "recipe",
      recipeId: "r",
      name: "Rice",
      ingredientId: "i:rice",
      unit: "g",
      qty: 100,
      createdAt: 1,
      ...over,
    });

  it("sums compatible quantities through validated conversions", () => {
    const [g] = groupByIngredient([
      item({ recipeId: "a", qty: 300, unit: "g" }),
      item({ recipeId: "b", qty: 0.5, unit: "kg" }),
    ]);
    expect(g.total).toBe(800);
    expect(g.totalUnit).toBe("g");
    expect(g.incompatible).toBe(false);
  });

  it("does not add incompatible units together", () => {
    const [g] = groupByIngredient([
      item({ recipeId: "a", qty: 2, unit: "cup" }),
      item({ recipeId: "b", qty: 300, unit: "g" }),
    ]);
    expect(g.total).toBeNull();
    expect(g.incompatible).toBe(true);
    expect(g.items).toHaveLength(2);
  });

  it("does not total clarification items or bought items", () => {
    const [g] = groupByIngredient([
      item({ recipeId: "a", qty: 300 }),
      item({ recipeId: "b", qty: null, needsClarification: true }),
    ]);
    expect(g.total).toBeNull();
    const [h] = groupByIngredient([
      item({ recipeId: "a", qty: 300 }),
      item({ recipeId: "b", qty: 200, checked: true }),
    ]);
    expect(h.total).toBe(300);
  });

  it("keeps items for different recipes separate on the list", () => {
    const merged = mergeRecipeNeeds([item({ recipeId: "a", lineId: "l", id: "shop:a:l" })], {
      recipeId: "b",
      recipeSlug: "b",
      servings: 2,
      needs: [
        {
          lineId: "l",
          ingredientId: "i:rice",
          name: "Rice",
          qty: 2,
          unit: "cup",
          requiredQty: 2,
          availableQty: 0,
          needsClarification: false,
        },
      ],
      resolvedLineIds: [],
      now: 2,
    });
    expect(merged.items).toHaveLength(2);
  });
});
