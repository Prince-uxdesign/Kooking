import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { groupByIngredient, shoppingItemSchema } from "@/shared/domain/shopping";
import { ShoppingItemRow } from "./ShoppingItemRow";

const base = shoppingItemSchema.parse({
  id: "shop:r:rice",
  origin: "recipe",
  recipeId: "r",
  recipeSlug: "r",
  lineId: "rice",
  ingredientId: "i:rice",
  name: "Rice",
  unit: "cup",
  qty: 2,
  requiredQty: 3,
  availableQty: 1,
  servingsContext: 4,
  createdAt: 1,
});

const render = (item = base, group?: ReturnType<typeof groupByIngredient>[number]) =>
  renderToStaticMarkup(<ShoppingItemRow item={item} group={group} onToggle={() => {}} />);

describe("ShoppingItemRow", () => {
  it("shows what to buy apart from what the recipe needs", () => {
    const html = render();
    expect(html).toContain("2 cup");
    expect(html).toContain("Recipe needs 3 cup · you have 1 cup");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("Bought");
  });

  it("marks bought items with text, not colour alone", () => {
    expect(render({ ...base, checked: true })).toContain("Bought");
  });

  it("shows clarification items without a made-up amount", () => {
    const html = render({
      ...base,
      qty: null,
      availableQty: null,
      needsClarification: true,
      clarification: "You have 2 cup, which can't be compared with 400 g.",
    });
    expect(html).toContain("Amount to check");
    expect(html).toContain("can&#x27;t be compared");
  });

  it("explains when amounts from other recipes can't be combined", () => {
    const other = { ...base, id: "shop:s:rice", recipeId: "s", unit: "g", qty: 300 };
    const [group] = groupByIngredient([base, other]);
    expect(render(base, group)).toContain("can&#x27;t be added together");
  });
});
