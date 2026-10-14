import { describe, expect, it } from "vitest";
import { dedust, formatQuantity, isValidAmount, scaleAmount } from "./units";

describe("dedust", () => {
  it("removes binary floating-point dust", () => {
    expect(dedust(0.1 * 3)).toBe(0.3);
    expect(dedust(0.1 + 0.2)).toBe(0.3);
  });
});

describe("isValidAmount", () => {
  it.each([0.5, 1, 400, 1_000_000])("accepts %s", (v) => {
    expect(isValidAmount(v)).toBe(true);
  });
  it.each([0, -1, NaN, Infinity, 1_000_001, "400", null])("rejects %s", (v) => {
    expect(isValidAmount(v)).toBe(false);
  });
});

describe("scaleAmount", () => {
  it("scales metric quantities linearly with category rounding", () => {
    expect(scaleAmount(400, 4, 6, "linear", "g")).toMatchObject({ amount: 600 });
    // 70g * 6/4 = 105 -> nearest 5
    expect(scaleAmount(70, 4, 6, "linear", "g")).toMatchObject({ amount: 105 });
    // small masses round to halves, not dust: 2.5 * 6/4 = 3.75 -> 4
    expect(scaleAmount(2.5, 4, 6, "linear", "g")).toMatchObject({ amount: 4 });
  });

  it("keeps counts whole with a minimum of 1", () => {
    expect(scaleAmount(2, 4, 6, "discrete", "piece")).toMatchObject({ amount: 3 });
    expect(scaleAmount(2, 4, 1, "discrete", "piece")).toMatchObject({ amount: 1 });
    // count units stay whole even under linear behavior
    expect(scaleAmount(2, 4, 6, "linear", "piece")).toMatchObject({ amount: 3 });
  });

  it("snaps household volumes to quarters", () => {
    expect(scaleAmount(2, 4, 6, "linear", "cup")).toMatchObject({ amount: 3 });
    expect(scaleAmount(1, 4, 6, "linear", "cup")).toMatchObject({ amount: 1.5 });
  });

  it("preserves to-taste and manual lines untouched", () => {
    expect(scaleAmount(5, 4, 8, "to-taste", "tsp")).toMatchObject({ amount: null });
    expect(scaleAmount(400, 4, 8, "manual", "g")).toMatchObject({
      amount: 400,
      requiresManual: true,
    });
  });

  it("flags approximate scaling", () => {
    expect(scaleAmount(2, 4, 6, "approximate", "cup")).toMatchObject({
      amount: 3,
      approximate: true,
    });
  });
});

describe("formatQuantity", () => {
  it("reads null as to taste", () => {
    expect(formatQuantity(null, null)).toBe("to taste");
    expect(formatQuantity(null, "tsp")).toBe("to taste (tsp)");
  });
  it("renders household fractions as glyphs", () => {
    expect(formatQuantity(1.5, "cup")).toBe("1½ cup");
    expect(formatQuantity(0.25, "tsp")).toBe("¼ tsp");
    expect(formatQuantity(2, "cup")).toBe("2 cup");
  });
  it("renders metric plainly", () => {
    expect(formatQuantity(600, "g")).toBe("600 g");
  });
});
