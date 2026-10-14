/**
 * Units, quantity representation, and scaling math.
 *
 * Two deliberate constraints (see docs/RECIPE_CONTENT_MODEL.md):
 * 1. No unit conversions. `cup` never converts to `g` — Nigerian
 *    household measures (cups, derica, mudu) have no validated
 *    gram equivalents, so the model refuses to invent them.
 * 2. No floating-point dust. Scaling multiplies through integers
 *    where possible and rounds explicitly per unit category.
 */

/** Closed vocabulary. Unknown units are rejected at the schema boundary. */
export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "cup",
  "tbsp",
  "tsp",
  "piece",
  "clove",
  "slice",
  "stalk",
  "bunch",
  "sachet",
  "tin",
  "pinch",
] as const;

export type Unit = (typeof UNITS)[number];

type UnitCategory = "metric" | "household" | "count" | "free";

const CATEGORY: Record<Unit, UnitCategory> = {
  g: "metric",
  kg: "metric",
  ml: "metric",
  l: "metric",
  cup: "household",
  tbsp: "household",
  tsp: "household",
  piece: "count",
  clove: "count",
  slice: "count",
  stalk: "count",
  bunch: "count",
  sachet: "count",
  tin: "count",
  pinch: "free",
};

export function unitCategory(unit: Unit | string): UnitCategory {
  return (unit in CATEGORY ? CATEGORY[unit as Unit] : undefined) ?? "free";
}

/**
 * Safely converts an amount between compatible units.
 * Returns null if the conversion is unsupported or across incompatible categories
 * (e.g. mass to volume, volume to count, or household cups to grams).
 */
export function convertUnitQuantity(
  amount: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (!fromUnit || !toUnit) return null;
  if (fromUnit === toUnit) return dedust(amount);

  // Metric Mass: kg <-> g
  if (fromUnit === "kg" && toUnit === "g") return dedust(amount * 1000);
  if (fromUnit === "g" && toUnit === "kg") return dedust(amount / 1000);

  // Metric Volume: l <-> ml
  if (fromUnit === "l" && toUnit === "ml") return dedust(amount * 1000);
  if (fromUnit === "ml" && toUnit === "l") return dedust(amount / 1000);

  // Household Volume: tbsp <-> tsp (culinary standard: 1 tbsp = 3 tsp)
  if (fromUnit === "tbsp" && toUnit === "tsp") return dedust(amount * 3);
  if (fromUnit === "tsp" && toUnit === "tbsp") return dedust(amount / 3);

  // Any other cross-unit conversion is unsupported / incompatible without verified density
  return null;
}

export function areUnitsCompatible(
  unitA: string | null | undefined,
  unitB: string | null | undefined,
): boolean {
  if (!unitA || !unitB) return false;
  if (unitA === unitB) return true;
  return convertUnitQuantity(1, unitA, unitB) !== null;
}

export const SCALING_BEHAVIORS = [
  "linear",
  "discrete",
  "approximate",
  "to-taste",
  "manual",
] as const;

export type ScalingBehavior = (typeof SCALING_BEHAVIORS)[number];

/**
 * Strip binary floating-point dust before any display rounding.
 * e.g. 0.1 * 3 -> 0.30000000000000004 -> 0.3
 */
export function dedust(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e9) / 1e9;
}

export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 1_000_000;
}

function roundMetric(value: number): number {
  if (value >= 20) return Math.round(value / 5) * 5;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 2) / 2;
}

const COOKING_FRACTION_TARGETS = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1];

function roundHousehold(value: number): number {
  const whole = Math.floor(value);
  const frac = value - whole;
  let bestTarget = 0;
  let minDiff = Infinity;
  for (const target of COOKING_FRACTION_TARGETS) {
    const diff = Math.abs(frac - target);
    if (diff < minDiff) {
      minDiff = diff;
      bestTarget = target;
    }
  }
  return dedust(whole + bestTarget);
}

export interface ScaledQuantity {
  amount: number | null;
  /** True when the number is guidance ("about 2 cups"), not exact. */
  approximate: boolean;
  /** True when a cook must judge manually — never auto-applied silently. */
  requiresManual: boolean;
}

/**
 * Scale one quantity from base to target servings.
 * Timers and step text never pass through here (invariant by design).
 */
export function scaleAmount(
  amount: number | null,
  baseServings: number,
  targetServings: number,
  behavior: ScalingBehavior,
  unit: Unit | null,
): ScaledQuantity {
  if (behavior === "to-taste") return { amount: null, approximate: false, requiresManual: false };
  if (behavior === "manual" || amount === null || unit === null) {
    return { amount, approximate: false, requiresManual: behavior === "manual" };
  }
  // Guard against invalid/non-finite or non-positive amounts
  if (!Number.isFinite(amount) || amount <= 0) {
    return { amount: null, approximate: false, requiresManual: true };
  }
  // Guard against non-finite or non-positive servings counts
  if (
    !Number.isFinite(baseServings) ||
    baseServings <= 0 ||
    !Number.isFinite(targetServings) ||
    targetServings <= 0
  ) {
    return { amount, approximate: false, requiresManual: true };
  }
  const category = unit in CATEGORY ? CATEGORY[unit] : null;
  if (!category) {
    return { amount, approximate: false, requiresManual: true };
  }
  const raw = dedust((amount * targetServings) / baseServings);
  if (behavior === "discrete" || category === "count") {
    return { amount: Math.max(1, Math.round(raw)), approximate: false, requiresManual: false };
  }
  if (category === "household") {
    return {
      amount: roundHousehold(raw),
      approximate: behavior === "approximate",
      requiresManual: false,
    };
  }
  if (unit === "kg" || unit === "l") {
    return {
      amount: dedust(Math.round(raw * 100) / 100),
      approximate: behavior === "approximate",
      requiresManual: false,
    };
  }
  return {
    amount: roundMetric(raw),
    approximate: behavior === "approximate",
    requiresManual: false,
  };
}

const FRACTIONS: Array<[number, string]> = [
  [0.25, "¼"],
  [0.5, "½"],
  [0.75, "¾"],
  [1 / 3, "⅓"],
  [2 / 3, "⅔"],
];

function trimNumber(value: number): string {
  return String(dedust(value)).replace(/\.0+$/, "");
}

/** Human display for a scaled quantity. Null reads as "to taste". */
export function formatQuantity(amount: number | null, unit: Unit | null): string {
  if (amount === null) return unit ? `to taste (${unit})` : "to taste";
  if (unit === null) return trimNumber(amount);
  if (unitCategory(unit) === "household") {
    const whole = Math.floor(amount + 1e-9);
    const frac = dedust(amount - whole);
    for (const [value, glyph] of FRACTIONS) {
      if (Math.abs(frac - value) < 1e-4) {
        return whole > 0 ? `${whole}${glyph} ${unit}` : `${glyph} ${unit}`;
      }
    }
    if (frac < 1e-4) return `${whole} ${unit}`;
  }
  return `${trimNumber(amount)} ${unit}`;
}

/* Quantity text typed by a cook (Kitchen Check, shopping list). */

export type ParsedQuantity =
  { kind: "empty" } | { kind: "ok"; value: number } | { kind: "invalid"; message: string };

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
};

const MAX_QTY = 1_000_000;

/**
 * Accepts "2", "1.5", "1,5", "1/2", "1 1/2", "½", "1½". Rejects
 * negatives, text and anything non-finite. Zero is a valid answer
 * ("I have none left of the packet").
 */
export function parseQuantityText(raw: string): ParsedQuantity {
  const text = raw.trim();
  if (text === "") return { kind: "empty" };

  const bad = (message = "Enter a number, like 2 or 1/2."): ParsedQuantity => ({
    kind: "invalid",
    message,
  });

  if (text.startsWith("-")) return bad("Amount can't be negative.");

  let value: number | null = null;

  const mixedGlyph = /^(\d+)?\s*([½⅓⅔¼¾])$/.exec(text);
  const decimal = /^(\d+)([.,]\d+)?$/.exec(text) ?? /^([.,]\d+)$/.exec(text);
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(text);
  const mixedFraction = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(text);

  if (mixedGlyph) {
    value = Number(mixedGlyph[1] ?? 0) + UNICODE_FRACTIONS[mixedGlyph[2]];
  } else if (mixedFraction) {
    const d = Number(mixedFraction[3]);
    if (d === 0) return bad();
    value = Number(mixedFraction[1]) + Number(mixedFraction[2]) / d;
  } else if (fraction) {
    const d = Number(fraction[2]);
    if (d === 0) return bad();
    value = Number(fraction[1]) / d;
  } else if (decimal) {
    value = Number(text.replace(",", "."));
  }

  if (value === null || !Number.isFinite(value)) return bad();
  if (value > MAX_QTY) return bad("That amount is too large.");
  // Strip float dust (1/3 -> 0.333333333) so equality with scaled amounts holds.
  return { kind: "ok", value: dedust(value) };
}
