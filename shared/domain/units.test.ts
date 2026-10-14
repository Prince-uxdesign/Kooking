import { describe, expect, it } from "vitest";
import {
  areUnitsCompatible,
  convertUnitQuantity,
  dedust,
  formatQuantity,
  isValidAmount,
  scaleAmount,
} from "./units";

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
    expect(formatQuantity(0.75, "cup")).toBe("¾ cup");
    expect(formatQuantity(1 / 3, "cup")).toBe("⅓ cup");
    expect(formatQuantity(2 / 3, "cup")).toBe("⅔ cup");
    expect(formatQuantity(1 + 1 / 3, "cup")).toBe("1⅓ cup");
    expect(formatQuantity(2 + 2 / 3, "tbsp")).toBe("2⅔ tbsp");
    expect(formatQuantity(2, "cup")).toBe("2 cup");
  });
  it("renders metric plainly", () => {
    expect(formatQuantity(600, "g")).toBe("600 g");
    expect(formatQuantity(1.25, "kg")).toBe("1.25 kg");
  });
});

describe("convertUnitQuantity", () => {
  it("converts between compatible metric mass units", () => {
    expect(convertUnitQuantity(1.5, "kg", "g")).toBe(1500);
    expect(convertUnitQuantity(500, "g", "kg")).toBe(0.5);
  });

  it("converts between compatible metric volume units", () => {
    expect(convertUnitQuantity(2, "l", "ml")).toBe(2000);
    expect(convertUnitQuantity(250, "ml", "l")).toBe(0.25);
  });

  it("converts between compatible household volume units (tbsp <-> tsp)", () => {
    expect(convertUnitQuantity(2, "tbsp", "tsp")).toBe(6);
    expect(convertUnitQuantity(6, "tsp", "tbsp")).toBe(2);
  });

  it("returns identical value when fromUnit and toUnit are identical", () => {
    expect(convertUnitQuantity(3, "cup", "cup")).toBe(3);
    expect(convertUnitQuantity(400, "g", "g")).toBe(400);
  });

  it("refuses to convert across incompatible categories or uncalibrated units", () => {
    expect(convertUnitQuantity(2, "cup", "g")).toBeNull();
    expect(convertUnitQuantity(1, "piece", "g")).toBeNull();
    expect(convertUnitQuantity(1, "ml", "g")).toBeNull();
    expect(convertUnitQuantity(1, "cup", "ml")).toBeNull();
  });

  it("rejects invalid, negative, or non-finite inputs", () => {
    expect(convertUnitQuantity(-5, "g", "kg")).toBeNull();
    expect(convertUnitQuantity(NaN, "g", "kg")).toBeNull();
    expect(convertUnitQuantity(Infinity, "g", "kg")).toBeNull();
    expect(convertUnitQuantity(100, null, "g")).toBeNull();
  });
});

describe("areUnitsCompatible", () => {
  it("recognizes compatible and incompatible units", () => {
    expect(areUnitsCompatible("kg", "g")).toBe(true);
    expect(areUnitsCompatible("l", "ml")).toBe(true);
    expect(areUnitsCompatible("tbsp", "tsp")).toBe(true);
    expect(areUnitsCompatible("cup", "cup")).toBe(true);

    expect(areUnitsCompatible("cup", "g")).toBe(false);
    expect(areUnitsCompatible("piece", "kg")).toBe(false);
    expect(areUnitsCompatible(null, "g")).toBe(false);
  });
});
