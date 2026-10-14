import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { addShortagesToList, buildKitchenCheckView, emptyRecord } from "./kitchen-check";
import { recipeSchema } from "./recipe-schema";
import {
  addPersonalItem,
  aisleForCatalogCategory,
  clearCompleted,
  draftFromItem,
  emptyList,
  groupByAisle,
  removeItem,
  setItemChecked,
  shoppingListSchema,
  updateItem,
  validateDraft,
  type ItemDraft,
  type ShoppingList,
  type ValidDraft,
} from "./shopping";

const draft = (over: Partial<ItemDraft> = {}): ItemDraft => ({
  name: "Onions",
  qtyText: "",
  unit: "",
  note: "",
  category: "",
  ...over,
});
const valid = (over: Partial<ItemDraft> = {}): ValidDraft => {
  const r = validateDraft(draft(over));
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.value;
};
let n = 0;
const add = (list: ShoppingList, over: Partial<ItemDraft> = {}) =>
  addPersonalItem(list, valid(over), { id: `p${++n}`, now: 10 + n });

describe("validateDraft", () => {
  it("accepts a bare free-form name", () => {
    expect(valid({ name: "  kitchen   roll " })).toEqual({
      name: "kitchen roll",
      qty: null,
      unit: null,
      notes: undefined,
      category: undefined,
    });
  });

  it("accepts quantity, unit, note and a chosen aisle", () => {
    expect(valid({ qtyText: "1 1/2", unit: "kg", note: "red ones", category: "produce" })).toEqual({
      name: "Onions",
      qty: 1.5,
      unit: "kg",
      notes: "red ones",
      category: "produce",
    });
  });

  it.each([
    [{ name: "  " }, "name"],
    [{ qtyText: "lots" }, "qty"],
    [{ qtyText: "-2" }, "qty"],
    [{ qtyText: "0" }, "qty"],
    [{ unit: "kg" }, "qty"],
    [{ qtyText: "2", unit: "bucket" }, "unit"],
    [{ note: "x".repeat(301) }, "note"],
  ])("rejects %o with a %s error", (over, field) => {
    const r = validateDraft(draft(over as Partial<ItemDraft>));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[field as keyof typeof r.errors]).toBeTruthy();
  });
});

describe("personal list operations", () => {
  it("adds a manual item with no recipe reference", () => {
    const { list, outcome } = add(emptyList("guest", 1), { qtyText: "3", unit: "piece" });
    expect(outcome).toBe("added");
    expect(list.items[0]).toMatchObject({
      origin: "personal",
      name: "Onions",
      qty: 3,
      unit: "piece",
      checked: false,
    });
    expect(list.items[0].recipeId).toBeUndefined();
    expect(() => shoppingListSchema.parse(list)).not.toThrow();
  });

  it("merges a repeat with a compatible unit instead of duplicating", () => {
    let list = add(emptyList("guest", 1), { name: "Rice", qtyText: "500", unit: "g" }).list;
    const second = add(list, { name: "rice", qtyText: "1", unit: "kg" });
    list = second.list;
    expect(second.outcome).toBe("merged");
    expect(list.items).toHaveLength(1);
    expect(list.items[0].qty).toBe(1500);
    expect(list.items[0].unit).toBe("g");
  });

  it("keeps incompatible units as separate lines", () => {
    let list = add(emptyList("guest", 1), { name: "Rice", qtyText: "2", unit: "cup" }).list;
    list = add(list, { name: "Rice", qtyText: "500", unit: "g" }).list;
    expect(list.items).toHaveLength(2);
  });

  it("reports a quantity-less repeat as already listed", () => {
    const list = add(emptyList("guest", 1), { name: "Bread" }).list;
    const again = add(list, { name: "bread" });
    expect(again.outcome).toBe("already-listed");
    expect(again.list).toBe(list);
  });

  it("does not merge into completed items", () => {
    let list = add(emptyList("guest", 1), { name: "Bread" }).list;
    list = setItemChecked(list, list.items[0].id, true, 5);
    expect(add(list, { name: "Bread" }).list.items).toHaveLength(2);
  });

  it("edits name, quantity, unit, note and aisle", () => {
    let list = add(emptyList("guest", 1), { name: "Onion" }).list;
    const id = list.items[0].id;
    list = updateItem(
      list,
      id,
      valid({ name: "Red onions", qtyText: "1", unit: "kg", note: "firm", category: "produce" }),
      50,
    );
    expect(list.items[0]).toMatchObject({
      name: "Red onions",
      qty: 1,
      unit: "kg",
      notes: "firm",
      category: "produce",
      updatedAt: 50,
    });
    expect(draftFromItem(list.items[0])).toEqual({
      name: "Red onions",
      qtyText: "1",
      unit: "kg",
      note: "firm",
      category: "produce",
    });
  });

  it("checks, unchecks, removes and clears only completed items", () => {
    let list = add(emptyList("guest", 1), { name: "A" }).list;
    list = add(list, { name: "B" }).list;
    list = add(list, { name: "C" }).list;
    const [a, b, c] = list.items.map((i) => i.id);
    list = setItemChecked(list, a, true, 2);
    list = setItemChecked(list, b, true, 3);
    list = setItemChecked(list, b, false, 4);
    expect(list.items.filter((i) => i.checked).map((i) => i.id)).toEqual([a]);
    list = clearCompleted(list, 5);
    expect(list.items.map((i) => i.id)).toEqual([b, c]);
    list = removeItem(list, c, 6);
    expect(list.items.map((i) => i.id)).toEqual([b]);
  });
});

describe("aisles", () => {
  it("maps only listed catalog categories", () => {
    expect(aisleForCatalogCategory("vegetables")).toBe("produce");
    expect(aisleForCatalogCategory("grains")).toBe("grains");
    expect(aisleForCatalogCategory("seasoning")).toBeUndefined();
    expect(aisleForCatalogCategory(undefined)).toBeUndefined();
  });

  it("groups in a fixed order with uncategorised last, or flat when nothing is sorted", () => {
    let list = add(emptyList("guest", 1), { name: "Salt" }).list;
    list = add(list, { name: "Beef", category: "proteins" }).list;
    list = add(list, { name: "Tomatoes", category: "produce" }).list;
    expect(groupByAisle(list.items).map((g) => g.label)).toEqual([
      "Produce",
      "Proteins",
      "Not sorted",
    ]);
    const flat = groupByAisle(add(emptyList("guest", 1), { name: "Salt" }).list.items);
    expect(flat).toHaveLength(1);
    expect(flat[0].label).toBe("");
  });
});

describe("recipe items on the personal list", () => {
  const recipe = recipeSchema.parse(seedJson);
  const names = { "demo:long-grain-rice": "Long-grain rice", "demo:tomato-paste": "Tomato paste" };
  const generate = (items: ShoppingList["items"], now: number) => {
    const record = {
      ...emptyRecord(recipe, 4, 1),
      entries: { "demo-rice": { have: false, qtyText: "", unit: null } },
    };
    const view = buildKitchenCheckView({ recipe, servings: 4, record, ingredientNames: names });
    return addShortagesToList(items, {
      recipe,
      servings: 4,
      rows: view.rows,
      now,
      ingredientCategories: { "demo:long-grain-rice": "grains" },
    });
  };

  it("appear alongside manual items, with an aisle from the catalog", () => {
    let list = add(emptyList("guest", 1), { name: "Bread" }).list;
    list = { ...list, items: generate(list.items, 20).items };
    expect(list.items.map((i) => i.origin).sort()).toEqual(["personal", "recipe"]);
    expect(list.items.find((i) => i.origin === "recipe")!.category).toBe("grains");
  });

  it("are never merged into by a manual item of the same name", () => {
    let list: ShoppingList = { ...emptyList("guest", 1), items: generate([], 20).items };
    list = add(list, { name: "Long-grain rice", qtyText: "100", unit: "g" }).list;
    expect(list.items).toHaveLength(2);
    expect(list.items.find((i) => i.origin === "recipe")!.qty).toBe(400);
  });

  it("keep the cook's edits when the recipe is shopped for again", () => {
    let list: ShoppingList = { ...emptyList("guest", 1), items: generate([], 20).items };
    const id = list.items[0].id;
    list = updateItem(
      list,
      id,
      valid({ name: "Basmati rice", qtyText: "1", unit: "kg", note: "the 1kg bag" }),
      30,
    );
    const again = generate(list.items, 40);
    const item = again.items.find((i) => i.id === id)!;
    expect(again.items).toHaveLength(1);
    expect(item).toMatchObject({
      name: "Basmati rice",
      qty: 1,
      unit: "kg",
      notes: "the 1kg bag",
      requiredQty: 400,
      recipeId: recipe.id,
      userEdited: true,
    });
  });

  it("keep their checked state through regeneration", () => {
    let list: ShoppingList = { ...emptyList("guest", 1), items: generate([], 20).items };
    list = setItemChecked(list, list.items[0].id, true, 25);
    expect(generate(list.items, 40).items[0].checked).toBe(true);
  });

  it("answer a clarification once the cook enters an amount", () => {
    const list: ShoppingList = {
      ...emptyList("guest", 1),
      items: [
        {
          ...generate([], 20).items[0],
          qty: null,
          needsClarification: true,
          clarification: "x",
        },
      ],
    };
    const edited = updateItem(
      list,
      list.items[0].id,
      valid({ name: "Rice", qtyText: "300", unit: "g" }),
      30,
    );
    expect(edited.items[0].needsClarification).toBe(false);
    expect(edited.items[0].qty).toBe(300);
  });
});
