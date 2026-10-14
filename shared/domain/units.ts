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

export function unitCategory(unit: Unit): UnitCategory {
  return CATEGORY[unit];
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

function roundHousehold(value: number): number {
  return Math.round(value * 4) / 4;
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
  const raw = dedust((amount * targetServings) / baseServings);
  if (behavior === "discrete" || CATEGORY[unit] === "count") {
    return { amount: Math.max(1, Math.round(raw)), approximate: false, requiresManual: false };
  }
  if (CATEGORY[unit] === "household") {
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
      if (Math.abs(frac - value) < 1e-9) {
        return whole > 0 ? `${whole}${glyph} ${unit}` : `${glyph} ${unit}`;
      }
    }
    if (frac < 1e-9) return `${whole} ${unit}`;
  }
  return `${trimNumber(amount)} ${unit}`;
}
