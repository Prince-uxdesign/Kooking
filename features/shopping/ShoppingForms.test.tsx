import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shoppingItemSchema } from "@/shared/domain/shopping";
import { AddItemForm } from "./AddItemForm";
import { ShoppingItemRow } from "./ShoppingItemRow";

const personal = shoppingItemSchema.parse({
  id: "p1",
  origin: "personal",
  name: "Bread",
  unit: null,
  qty: null,
  createdAt: 1,
});

describe("AddItemForm", () => {
  it("is a labelled form with a single fast name field and an add button", () => {
    const html = renderToStaticMarkup(<AddItemForm onAdd={() => {}} />);
    expect(html).toContain('for="add-item-name"');
    expect(html).toContain('aria-label="Add item"');
    expect(html).toContain('aria-expanded="false"');
    // Details exist but start collapsed.
    expect(html).toMatch(/id="add-item-details" hidden=""/);
    expect(html).toContain('inputMode="decimal"');
  });
});

describe("ShoppingItemRow (personal)", () => {
  it("has no quantity text or recipe line for a bare item, and an edit button", () => {
    const html = renderToStaticMarkup(
      <ShoppingItemRow item={personal} onToggle={() => {}} onEdit={() => {}} showRecipe />,
    );
    expect(html).toContain('aria-label="Bread"');
    expect(html).toContain('aria-label="Edit Bread"');
    expect(html).not.toContain("For ");
    expect(html).not.toContain("As needed");
  });

  it("names the source recipe for recipe items", () => {
    const html = renderToStaticMarkup(
      <ShoppingItemRow
        item={{ ...personal, origin: "recipe", recipeTitle: "Jollof", servingsContext: 4 }}
        onToggle={() => {}}
        showRecipe
      />,
    );
    expect(html).toContain("For Jollof · 4 servings");
  });
});
