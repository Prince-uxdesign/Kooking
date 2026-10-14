import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { KitchenCheckRow as Row } from "@/shared/domain/kitchen-check";
import { KitchenCheckRow } from "./KitchenCheckRow";

const base: Row = {
  lineId: "rice",
  ingredientId: "i:rice",
  name: "Rice",
  role: "required",
  roleLabel: "Required",
  roleHint: "Needed. This recipe doesn't work without it.",
  isBlocking: true,
  requiredQuantity: 3,
  requiredUnit: "cup",
  requiredDisplay: "3 cup",
  approximate: false,
  entry: null,
  haveQuantity: null,
  haveUnit: "cup",
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

const render = (row: Row) =>
  renderToStaticMarkup(
    <KitchenCheckRow
      row={row}
      alternativeNames={[]}
      onChange={() => {}}
      onOpenAlternatives={() => {}}
      onClearSubstitution={() => {}}
    />,
  );

describe("KitchenCheckRow", () => {
  it("shows required quantity, state text and a numeric amount field", () => {
    const html = render({
      ...base,
      state: "not-enough",
      entry: { have: true, qtyText: "1", unit: "cup" },
      availableDisplay: "1 cup",
      shortageDisplay: "2 cup",
    });
    expect(html).toContain("Not enough");
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain("Required");
    expect(html).toContain("1 cup");
    expect(html).toContain("2 cup");
  });

  it("does not show an amount field or quantities before the cook answers", () => {
    const html = render(base);
    expect(html).toContain("Not checked");
    expect(html).not.toContain('inputMode="decimal"');
    expect(html).not.toContain("Missing</dt>");
  });

  it("surfaces invalid input as an alert", () => {
    const html = render({
      ...base,
      state: "needs-review",
      entry: { have: true, qtyText: "abc", unit: "cup" },
      inputError: "Enter a number, like 2 or 1/2.",
    });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Needs review");
  });

  it("offers an approved alternative only when one is listed", () => {
    const missing = { ...base, state: "missing" as const, role: "substitutable" as const };
    expect(render(missing)).not.toContain("Approved alternative:");
    const html = renderToStaticMarkup(
      <KitchenCheckRow
        row={missing}
        alternativeNames={["Butter"]}
        onChange={() => {}}
        onOpenAlternatives={() => {}}
        onClearSubstitution={() => {}}
      />,
    );
    expect(html).toContain("Approved alternative: Butter");
  });
});
