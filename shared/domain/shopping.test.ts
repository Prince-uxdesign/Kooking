import { describe, expect, it } from "vitest";
import { recipeSchema } from "./recipe-schema";
import { scaleRecipe } from "./scaling";
import {
  createPersonalItem,
  deriveRecipeItems,
  shoppingListSchema,
  toggleItemChecked,
  type ShoppingItem,
} from "./shopping";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe = recipeSchema.parse(seedJson);
const NOW = 1_700_000_000_000;

function needLines() {
  return scaleRecipe(recipe, 4)
    .filter((l) => l.scaledQuantity !== null)
    .map((l) => ({
      id: l.id,
      ingredientId: l.ingredientId,
      scaledQuantity: l.scaledQuantity,
      unit: l.unit,
      name: l.id,
    }));
}

const baseArgs = {
  recipeId: recipe.id,
  recipeSlug: recipe.slug,
  servings: 4,
  now: NOW,
};

describe("deriveRecipeItems", () => {
  it("snapshots quantities with servings provenance", () => {
    const items = deriveRecipeItems([], { ...baseArgs, lines: needLines() });
    const rice = items.find((i) => i.ingredientId === "demo:long-grain-rice")!;
    expect(rice.qty).toBe(400);
    expect(rice.servingsContext).toBe(4);
    expect(rice.origin).toBe("recipe");
    expect(rice.checked).toBe(false);
  });

  it("aggregates re-adds for the same servings, separates others", () => {
    const once = deriveRecipeItems([], { ...baseArgs, lines: needLines() });
    const twice = deriveRecipeItems(once, { ...baseArgs, lines: needLines() });
    expect(twice.find((i) => i.ingredientId === "demo:long-grain-rice")!.qty).toBe(800);

    const other = deriveRecipeItems(twice, {
      ...baseArgs,
      servings: 6,
      lines: needLines().map((l) => ({ ...l, scaledQuantity: 600 })),
    });
    expect(other.filter((i) => i.ingredientId === "demo:long-grain-rice")).toHaveLength(2);
  });

  it("skips to-taste lines", () => {
    const items = deriveRecipeItems([], { ...baseArgs, lines: needLines() });
    expect(items.some((i) => i.ingredientId === "demo:salt")).toBe(false);
  });
});

describe("personal items", () => {
  it("creates and validates personal items", () => {
    const item = createPersonalItem({ id: "p1", name: "  Smoked fish  ", now: NOW });
    expect(item.name).toBe("Smoked fish");
    expect(item.origin).toBe("personal");
    expect(() => createPersonalItem({ id: "p2", name: "   ", now: NOW })).toThrow();
  });

  it("toggles checked state", () => {
    const item: ShoppingItem = createPersonalItem({ id: "p1", name: "Fish", now: NOW });
    const list = shoppingListSchema.parse({
      id: "l1",
      ownerId: "guest-1",
      items: [item],
      updatedAt: NOW,
    });
    const toggled = toggleItemChecked(list, "p1", NOW + 1);
    expect(toggled.items[0].checked).toBe(true);
    expect(toggled.updatedAt).toBe(NOW + 1);
  });
});
