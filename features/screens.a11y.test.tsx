// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KitchenCheckRow as Row } from "@/shared/domain/kitchen-check";
import { shoppingItemSchema } from "@/shared/domain/shopping";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { KitchenCheckRow } from "./kitchen-check/KitchenCheckRow";
import { AddItemForm } from "./shopping/AddItemForm";
import { ShoppingItemRow } from "./shopping/ShoppingItemRow";

let mounted: Mounted | null = null;
afterEach(async () => {
  await mounted?.unmount();
  mounted = null;
});

const clean = async (el: Element) =>
  expect(describeViolations(await axeViolations(el))).toEqual([]);
const noop = () => {};

/** Sets a controlled input's value the way a user typing would. */
async function type(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const submit = (form: HTMLFormElement) =>
  act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });

/* ------------------------------------------------------------------ */
/* Kitchen Check                                                      */
/* ------------------------------------------------------------------ */

const row: Row = {
  lineId: "rice",
  ingredientId: "i:rice",
  name: "Long-grain rice",
  role: "required",
  roleLabel: "Required",
  roleHint: "Needed. This recipe doesn't work without it.",
  isBlocking: true,
  requiredQuantity: 400,
  requiredUnit: "g",
  requiredDisplay: "400 g",
  approximate: false,
  entry: null,
  haveQuantity: null,
  haveUnit: "g",
  inputError: null,
  state: "not-checked",
  shortageQuantity: null,
  availableDisplay: null,
  shortageDisplay: null,
  approvedSubstitutes: [],
  substitutedBy: null,
  explanation: "",
  dataInvalid: false,
};

const rowStates: Array<[string, Row]> = [
  ["not checked", row],
  [
    "have enough",
    {
      ...row,
      state: "have-enough",
      entry: { have: true, qtyText: "400", unit: "g" },
      availableDisplay: "400 g",
      shortageDisplay: null,
    },
  ],
  [
    "not enough",
    {
      ...row,
      state: "not-enough",
      entry: { have: true, qtyText: "100", unit: "g" },
      availableDisplay: "100 g",
      shortageDisplay: "300 g",
    },
  ],
  ["missing", { ...row, state: "missing", entry: { have: false, qtyText: "", unit: null } }],
  [
    "invalid amount",
    {
      ...row,
      state: "needs-review",
      entry: { have: true, qtyText: "abc", unit: "g" },
      inputError: "Enter a number, like 250 or 1.5.",
    },
  ],
  [
    "optional, no quantity",
    {
      ...row,
      name: "Salt",
      role: "optional",
      roleLabel: "Optional",
      requiredQuantity: null,
      requiredUnit: null,
      requiredDisplay: "To taste",
      state: "optional",
    },
  ],
];

describe("Kitchen Check row", () => {
  it.each(rowStates)("%s: no axe violations", async (_label, r) => {
    mounted = await mount(
      <main>
        <h1>Kitchen Check</h1>
        <h2>Ingredients</h2>
        <ul>
          <KitchenCheckRow
            row={r}
            alternativeNames={[]}
            onChange={noop}
            onOpenAlternatives={noop}
            onClearSubstitution={noop}
          />
        </ul>
      </main>,
    );
    await clean(mounted.container);
  });

  it("says each status in words with an icon (never colour alone), and is operable as buttons", async () => {
    const seen: string[] = [];
    for (const [, r] of rowStates) {
      mounted = await mount(
        <ul>
          <KitchenCheckRow
            row={r}
            alternativeNames={[]}
            onChange={noop}
            onOpenAlternatives={noop}
            onClearSubstitution={noop}
          />
        </ul>,
      );
      const status = mounted.container.querySelector('[role="status"]')!;
      expect(status.textContent!.trim().length).toBeGreaterThan(0);
      expect(status.querySelector("svg[aria-hidden='true']")).toBeTruthy();
      seen.push(status.textContent!.trim());
      // Required vs optional is spoken, and the need is read as "Need 400 g".
      expect(mounted.container.textContent).toMatch(/Required|Optional/);
      await mounted.unmount();
      mounted = null;
    }
    expect(new Set(seen).size).toBeGreaterThan(4);
  });

  it("groups the answer buttons with a question and reports which is chosen", async () => {
    mounted = await mount(
      <ul>
        <KitchenCheckRow
          row={{ ...row, state: "missing", entry: { have: false, qtyText: "", unit: null } }}
          alternativeNames={[]}
          onChange={noop}
          onOpenAlternatives={noop}
          onClearSubstitution={noop}
        />
      </ul>,
    );
    const group = mounted.container.querySelector('[role="group"]')!;
    expect(group.getAttribute("aria-label")).toBe("Do you have Long-grain rice?");
    const pressed = [...group.querySelectorAll("button")].filter(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed.map((b) => b.textContent)).toEqual(["Don't have"]);
  });

  it("ties the amount error to its field and keeps what was typed", async () => {
    mounted = await mount(
      <ul>
        <KitchenCheckRow
          row={{
            ...row,
            state: "needs-review",
            entry: { have: true, qtyText: "abc", unit: "g" },
            inputError: "Enter a number, like 250 or 1.5.",
          }}
          alternativeNames={[]}
          onChange={noop}
          onOpenAlternatives={noop}
          onClearSubstitution={noop}
        />
      </ul>,
    );
    const input = mounted.container.querySelector("input")!;
    expect(input.value).toBe("abc");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const err = mounted.container.querySelector(`#${input.getAttribute("aria-describedby")}`)!;
    expect(err.getAttribute("role")).toBe("alert");
    expect(err.textContent).toContain("Enter a number");
    expect(mounted.container.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Shopping list                                                      */
/* ------------------------------------------------------------------ */

const item = shoppingItemSchema.parse({
  id: "shop:r:rice",
  origin: "recipe",
  recipeId: "r",
  recipeSlug: "r",
  recipeTitle: "Demo Tomato Rice",
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

describe("Shopping list", () => {
  it("rows have no axe violations: unchecked, bought and needing clarification", async () => {
    mounted = await mount(
      <main>
        <h1>Shopping List</h1>
        <ul>
          <ShoppingItemRow item={item} onToggle={noop} onEdit={noop} showRecipe />
          <ShoppingItemRow
            item={{ ...item, id: "b", checked: true }}
            onToggle={noop}
            onEdit={noop}
          />
          <ShoppingItemRow
            item={{
              ...item,
              id: "c",
              qty: null,
              availableQty: null,
              needsClarification: true,
              clarification: "You have 2 cup, which can't be compared with 400 g.",
            }}
            onToggle={noop}
          />
        </ul>
      </main>,
    );
    await clean(mounted.container);
  });

  it("a checkbox is named by the item, reports bought via its state, and the row is a real checkbox", async () => {
    mounted = await mount(
      <ul>
        <ShoppingItemRow item={{ ...item, checked: true }} onToggle={noop} onEdit={noop} />
      </ul>,
    );
    const box = mounted.container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(box.getAttribute("aria-label")).not.toMatch(/bought/i); // state isn't repeated in the name
    expect(mounted.container.textContent).toContain("Bought"); // visible, not colour alone
    const edit = mounted.container.querySelector("button")!;
    expect(edit.getAttribute("aria-label")).toBe("Edit Rice");
  });

  it("add form: labelled, optional fields say so, and an empty name explains and focuses the field", async () => {
    const onAdd = vi.fn();
    mounted = await mount(
      <main>
        <h1>Shopping List</h1>
        <AddItemForm onAdd={onAdd} />
      </main>,
    );
    await clean(mounted.container);
    const form = mounted.container.querySelector("form") as HTMLFormElement;
    const name = mounted.container.querySelector("#add-item-name") as HTMLInputElement;
    expect(mounted.container.querySelector('label[for="add-item-name"]')).toBeTruthy();
    for (const f of ["qty", "unit", "category", "note"]) {
      expect(mounted.container.querySelector(`label[for="add-item-${f}"]`)!.textContent).toContain(
        "(optional)",
      );
    }

    // Typed detail survives an error; the error is tied to the name field.
    await type(mounted.container.querySelector("#add-item-qty") as HTMLInputElement, "2");
    await submit(form);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(onAdd).not.toHaveBeenCalled();
    expect(name.getAttribute("aria-invalid")).toBe("true");
    const err = mounted.container.querySelector(`#${name.getAttribute("aria-describedby")}`)!;
    expect(err.getAttribute("role")).toBe("alert");
    expect(err.textContent!.length).toBeGreaterThan(5);
    expect(document.activeElement).toBe(name);
    expect((mounted.container.querySelector("#add-item-qty") as HTMLInputElement).value).toBe("2");
    await clean(mounted.container);
  });

  it("add form: a bad quantity opens the details and moves focus to that field", async () => {
    mounted = await mount(<AddItemForm onAdd={noop} />);
    await type(mounted.container.querySelector("#add-item-name") as HTMLInputElement, "Onions");
    await type(mounted.container.querySelector("#add-item-qty") as HTMLInputElement, "lots");
    await submit(mounted.container.querySelector("form") as HTMLFormElement);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    const qty = mounted.container.querySelector("#add-item-qty") as HTMLInputElement;
    expect(mounted.container.querySelector("#add-item-details")!.hasAttribute("hidden")).toBe(
      false,
    );
    expect(qty.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(qty);
    expect(qty.value).toBe("lots");
  });
});
