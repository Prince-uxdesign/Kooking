import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import {
  MAX_STORED_CHECKS,
  addShortagesToList,
  buildKitchenCheckView,
  emptyRecord,
  kitchenCheckKey,
  parseQuantityText,
  readinessHeadline,
  resolveServings,
  upsertRecord,
  withEntry,
  withSubstitution,
  type KitchenCheckRecord,
} from "./kitchen-check";
import { kitchenCheckHref, recipeHref } from "./navigation";
import { recipeSchema } from "./recipe-schema";

const recipe = recipeSchema.parse(seedJson);
const names: Record<string, string> = {
  "demo:long-grain-rice": "Long-grain rice",
  "demo:tomato-paste": "Tomato paste",
  "demo:tomato-puree": "Tomato puree",
  "demo:salt": "Salt",
  "demo:plantain": "Plantain",
};

function record(entries: KitchenCheckRecord["entries"], substitutions = {}): KitchenCheckRecord {
  return { ...emptyRecord(recipe, 4, 1), entries, substitutions };
}
const view = (r: KitchenCheckRecord | null, servings = 4, n = names) =>
  buildKitchenCheckView({ recipe, servings, record: r, ingredientNames: n });
const stateOf = (v: ReturnType<typeof view>, id: string) =>
  v.rows.find((r) => r.lineId === id)!.state;

const have = (qty: string, unit: string | null) => ({ have: true, qtyText: qty, unit });
const none = { have: false, qtyText: "", unit: null };

describe("resolveServings", () => {
  it("falls back to base servings without flagging when absent", () => {
    expect(resolveServings(null, recipe)).toEqual({ servings: 4, adjusted: false });
  });
  it("carries a valid serving count unchanged", () => {
    expect(resolveServings("8", recipe)).toEqual({ servings: 8, adjusted: false });
  });
  it("flags garbage and out-of-range values instead of silently resetting", () => {
    expect(resolveServings("abc", recipe)).toEqual({ servings: 4, adjusted: true });
    expect(resolveServings("0", recipe)).toEqual({ servings: 1, adjusted: true });
    expect(resolveServings("99", recipe)).toEqual({ servings: 12, adjusted: true });
  });
});

describe("parseQuantityText", () => {
  it.each([
    ["2", 2],
    ["1.5", 1.5],
    ["1,5", 1.5],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["½", 0.5],
    ["1½", 1.5],
    ["0", 0],
  ])("parses %s", (input, expected) => {
    expect(parseQuantityText(input)).toEqual({ kind: "ok", value: expected });
  });

  it("treats blank as empty", () => {
    expect(parseQuantityText("  ")).toEqual({ kind: "empty" });
  });

  it.each(["abc", "-2", "1/0", "2 cups", "1e5", "Infinity", "9999999"])("rejects %s", (input) => {
    expect(parseQuantityText(input).kind).toBe("invalid");
  });
});

describe("buildKitchenCheckView", () => {
  it("lists every ingredient, scaled to the carried servings", () => {
    const v = view(null, 8);
    expect(v.rows).toHaveLength(recipe.ingredients.length);
    expect(v.servings).toBe(8);
    expect(v.rows.find((r) => r.lineId === "demo-rice")!.requiredQuantity).toBe(800);
  });

  it("never treats unanswered lines as missing or available", () => {
    const v = view(null);
    expect(v.rows.every((r) => r.state === "not-checked")).toBe(true);
    expect(v.summary.checked).toBe(0);
    expect(v.summary.toShop).toBe(0);
    expect(v.gate.canStart).toBe(false);
  });

  it("marks enough, not enough (with shortage), and missing from entered amounts", () => {
    const enough = view(record({ "demo-rice": have("400", "g") }));
    expect(stateOf(enough, "demo-rice")).toBe("have-enough");

    const short = view(record({ "demo-rice": have("250", "g") }));
    const row = short.rows.find((r) => r.lineId === "demo-rice")!;
    expect(row.state).toBe("not-enough");
    expect(row.shortageQuantity).toBe(150);

    const missing = view(record({ "demo-rice": none }));
    expect(stateOf(missing, "demo-rice")).toBe("missing");
  });

  it("uses safe conversions the domain already supports", () => {
    const v = view(record({ "demo-rice": have("0.5", "kg") }));
    expect(stateOf(v, "demo-rice")).toBe("have-enough");
  });

  it("asks for review on incompatible units instead of inventing a conversion", () => {
    const v = view(record({ "demo-rice": have("2", "cup") }));
    expect(stateOf(v, "demo-rice")).toBe("needs-review");
    expect(v.gate.canStart).toBe(false);
  });

  it("asks for review when 'have some' has no amount yet", () => {
    const v = view(record({ "demo-rice": have("", "g") }));
    expect(stateOf(v, "demo-rice")).toBe("needs-review");
  });

  it("surfaces invalid quantity input and does not count it as available", () => {
    const v = view(record({ "demo-rice": have("lots", "g") }));
    const row = v.rows.find((r) => r.lineId === "demo-rice")!;
    expect(row.state).toBe("needs-review");
    expect(row.inputError).toBeTruthy();
    expect(row.haveQuantity).toBeNull();
  });

  it("shows a skipped optional ingredient as optional, not blocking", () => {
    const v = view(record({ "demo-salt": none }));
    expect(stateOf(v, "demo-salt")).toBe("optional");
    expect(v.rows.find((r) => r.lineId === "demo-salt")!.isBlocking).toBe(false);
  });

  it("applies only approved alternatives", () => {
    const withSwap = view(
      record({ "demo-tomato-paste": none }, { "demo-tomato-paste": "demo:tomato-puree" }),
    );
    const row = withSwap.rows.find((r) => r.lineId === "demo-tomato-paste")!;
    expect(row.state).toBe("alternative");
    expect(row.substitutedBy).toBe("Tomato puree");

    const forged = view(
      record({ "demo-tomato-paste": none }, { "demo-tomato-paste": "demo:not-approved" }),
    );
    expect(stateOf(forged, "demo-tomato-paste")).toBe("missing");
  });

  it("opens Start cooking only when every required line is answered and met", () => {
    const required = {
      "demo-rice": have("400", "g"),
      "demo-tomato-paste": have("70", "g"),
    };
    const v = view(record(required));
    expect(v.gate).toEqual({ canStart: true, reason: null });

    const partial = view(record({ "demo-rice": have("400", "g") }));
    expect(partial.gate.canStart).toBe(false);
    expect(partial.gate.reason).toMatch(/Check the last required/);
  });

  it("falls back to the ingredient id when catalog metadata is missing", () => {
    const v = view(null, 4, {});
    expect(v.rows.find((r) => r.lineId === "demo-rice")!.name).toBe("demo:long-grain-rice");
  });
});

describe("readinessHeadline", () => {
  it("only reports derived counts", () => {
    expect(readinessHeadline(view(null).summary)).toEqual({
      title: "Let's check your ingredients.",
      detail: null,
    });
    const v = view(record({ "demo-rice": have("400", "g"), "demo-tomato-paste": none }));
    const h = readinessHeadline(v.summary);
    expect(h.title).toBe("You've checked 2 of 4 ingredients.");
    expect(h.detail).toBe("1 ingredient still needs attention.");
  });
});

describe("entry updates", () => {
  it("clears a stored swap when the cook says they have the ingredient", () => {
    let r = emptyRecord(recipe, 4, 1);
    r = withSubstitution(r, recipe, "demo-tomato-paste", "demo:tomato-puree", 2);
    expect(r.substitutions["demo-tomato-paste"]).toBe("demo:tomato-puree");
    r = withEntry(r, "demo-tomato-paste", have("70", "g"), 3);
    expect(r.substitutions["demo-tomato-paste"]).toBeUndefined();
  });

  it("refuses substitutes the recipe does not approve", () => {
    const r = emptyRecord(recipe, 4, 1);
    expect(withSubstitution(r, recipe, "demo-tomato-paste", "demo:anything", 2)).toBe(r);
    expect(withSubstitution(r, recipe, "demo-rice", "demo:tomato-puree", 2)).toBe(r);
  });

  it("scopes records by recipe version and servings, and caps history", () => {
    expect(kitchenCheckKey(recipe, 4)).not.toBe(kitchenCheckKey(recipe, 6));
    let all: KitchenCheckRecord[] = [];
    for (let i = 0; i < MAX_STORED_CHECKS + 5; i++) {
      all = upsertRecord(all, {
        ...emptyRecord(recipe, 1, i),
        key: `k${i}`,
        updatedAt: i,
      });
    }
    expect(all).toHaveLength(MAX_STORED_CHECKS);
    expect(all[0].key).toBe(`k${MAX_STORED_CHECKS + 4}`);
  });
});

describe("addShortagesToList", () => {
  const args = (rows: ReturnType<typeof view>["rows"]) => ({
    recipe,
    servings: 4,
    rows,
    now: 10,
  });

  it("adds only missing and short lines, at the shortage amount", () => {
    const v = view(
      record({
        "demo-rice": have("250", "g"),
        "demo-tomato-paste": none,
        "demo-salt": none,
      }),
    );
    const { items, added } = addShortagesToList([], args(v.rows));
    expect(added).toBe(2);
    expect(items.map((i) => i.name).sort()).toEqual(["Long-grain rice", "Tomato paste"]);
    expect(items.find((i) => i.name === "Long-grain rice")!.qty).toBe(150);
    expect(items.find((i) => i.name === "Tomato paste")!.qty).toBe(70);
  });

  it("is idempotent — repeating does not double quantities", () => {
    const v = view(record({ "demo-rice": none }));
    const once = addShortagesToList([], args(v.rows)).items;
    const twice = addShortagesToList(once, args(v.rows)).items;
    expect(twice).toEqual(once);
    expect(twice[0].qty).toBe(400);
  });

  it("adds nothing for unchecked lines", () => {
    expect(addShortagesToList([], args(view(null).rows)).items).toEqual([]);
  });
});

describe("navigation", () => {
  it("carries servings and origin into Kitchen Check and back", () => {
    expect(kitchenCheckHref("jollof", { servings: 4, from: "/recipes" })).toBe(
      "/recipes/jollof/kitchen-check?servings=4&from=%2Frecipes",
    );
    expect(recipeHref("jollof", { servings: 4 })).toBe("/recipes/jollof?servings=4");
    expect(recipeHref("jollof")).toBe("/recipes/jollof");
  });
});
