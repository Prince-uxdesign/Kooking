import { z } from "zod";
import type { ScaledLine } from "./scaling";

/** What the cook reports having for one ingredient line. */
export const pantryInputSchema = z.object({
  ingredientId: z.string().min(1),
  have: z.boolean(),
  haveQty: z.number().positive().nullable().optional(),
  unit: z.string().nullable().optional(),
});

export type PantryInput = z.infer<typeof pantryInputSchema>;

export type ItemStatus = "have" | "need" | "substitute-ok" | "optional-missing";

export interface ReadinessItem {
  ingredientId: string;
  status: ItemStatus;
  needQty: number | null;
  approximate: boolean;
}

export interface ReadinessReport {
  ready: boolean;
  items: ReadinessItem[];
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * Pure readiness evaluation (Phase 1 §7). Optional and garnish lines
 * never block. Cross-unit input falls back to the boolean `have`
 * flag — the model refuses to guess conversions.
 */
export function evaluateReadiness(
  scaledLines: ScaledLine[],
  pantry: PantryInput[],
): ReadinessReport {
  const byId = new Map(pantry.map((p) => [p.ingredientId, p]));
  const items: ReadinessItem[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const line of scaledLines) {
    const input = byId.get(line.id);
    const blocking = line.role === "required" || line.role === "substitutable";

    if (!input || !input.have) {
      // Substitutable lines still report `need` here; the cook confirms
      // a chef-approved swap explicitly via applySubstitute().
      const status: ItemStatus = blocking ? "need" : "optional-missing";
      items.push({
        ingredientId: line.id,
        status,
        needQty: line.scaledQuantity,
        approximate: line.approximate,
      });
      if (blocking) missingRequired.push(line.id);
      else missingOptional.push(line.id);
      continue;
    }

    if (
      line.scaledQuantity !== null &&
      input.haveQty != null &&
      input.unit != null &&
      line.unit != null &&
      input.unit === line.unit &&
      input.haveQty >= line.scaledQuantity
    ) {
      items.push({ ingredientId: line.id, status: "have", needQty: null, approximate: false });
      continue;
    }

    if (
      line.scaledQuantity !== null &&
      input.haveQty != null &&
      input.unit != null &&
      line.unit != null &&
      input.unit !== line.unit
    ) {
      // Unit mismatch: trust the boolean, flag the quantity as approximate.
      items.push({
        ingredientId: line.id,
        status: "have",
        needQty: null,
        approximate: true,
      });
      continue;
    }

    if (line.scaledQuantity === null || input.haveQty == null) {
      items.push({ ingredientId: line.id, status: "have", needQty: null, approximate: false });
      continue;
    }

    if (input.haveQty >= (line.scaledQuantity ?? 0)) {
      items.push({ ingredientId: line.id, status: "have", needQty: null, approximate: false });
    } else {
      const status: ItemStatus = blocking ? "need" : "optional-missing";
      items.push({
        ingredientId: line.id,
        status,
        needQty: dedustDiff(line.scaledQuantity, input.haveQty),
        approximate: line.approximate,
      });
      if (blocking) missingRequired.push(line.id);
      else missingOptional.push(line.id);
    }
  }

  return {
    ready: missingRequired.length === 0,
    items,
    missingRequired,
    missingOptional,
  };
}

function dedustDiff(need: number, have: number): number {
  return Math.round((need - have + Number.EPSILON) * 1e9) / 1e9;
}

/**
 * Resolve `substitute-ok` after evaluation: a substitutable line marked
 * `need` becomes `substitute-ok` when the cook confirms one of its
 * chef-approved substitutes by name.
 */
export function applySubstitute(
  report: ReadinessReport,
  lineId: string,
  substituteName: string,
  allowedSubstitutes: string[],
): ReadinessReport {
  if (!allowedSubstitutes.includes(substituteName)) return report;
  const items = report.items.map((item) =>
    item.ingredientId === lineId && item.status === "need"
      ? { ...item, status: "substitute-ok" as const, needQty: null }
      : item,
  );
  const missingRequired = report.missingRequired.filter((id) => id !== lineId);
  return {
    items,
    missingRequired,
    missingOptional: report.missingOptional,
    ready: missingRequired.length === 0,
  };
}
