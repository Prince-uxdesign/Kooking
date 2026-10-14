import { z } from "zod";
import type { Recipe, RecipeIngredient, IngredientRole } from "./recipe-schema";
import { scaleRecipe, type ScaledLine } from "./scaling";
import { convertUnitQuantity, dedust } from "./units";

/** What the cook reports having for one ingredient line. */
export const pantryInputSchema = z.object({
  ingredientId: z.string().min(1),
  have: z.boolean(),
  haveQty: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
});

export type PantryInput = z.infer<typeof pantryInputSchema>;
export type PantryItemInput = PantryInput;

export type RequirementStatus =
  "satisfied" | "missing" | "insufficient" | "substitute-satisfied" | "unresolved";

export type UnresolvedReason = "incompatible-units" | "unverified-quantity" | "invalid-data";

export interface SubstitutionSelection {
  lineId: string;
  substituteIngredientId: string;
}

/** Structured, deterministic evaluation for a single ingredient requirement line */
export interface IngredientRequirementResult {
  lineId: string;
  ingredientId: string;
  ingredientName?: string;
  role: IngredientRole;
  isBlocking: boolean;
  satisfied: boolean;
  missing: boolean;
  insufficient: boolean;
  shortageQuantity: number | null;
  shortageUnit: string | null;
  requiredQuantity: number | null;
  requiredUnit: string | null;
  availableQuantity: number | null;
  availableUnit: string | null;
  status: RequirementStatus;
  unresolvedReason?: UnresolvedReason;
  needsConfirmation: boolean;
  availableSubstitutes: string[];
  substitutedBy?: {
    ingredientId: string;
    ingredientName?: string;
    approved: boolean;
  };
  explanation: string;
  notes?: string;
}

export interface ReadinessEvaluationOptions {
  strictQuantities?: boolean;
  requireGarnish?: boolean;
  ingredientNames?: Map<string, string> | Record<string, string>;
  substitutions?: SubstitutionSelection[] | Record<string, string>;
}

export type ItemStatus = "have" | "need" | "substitute-ok" | "optional-missing" | "unresolved";

export interface ReadinessItem {
  ingredientId: string;
  status: ItemStatus;
  needQty: number | null;
  approximate: boolean;
  unresolvedReason?: UnresolvedReason;
}

export interface RecipeReadinessReport {
  ready: boolean;
  servings: number;
  totalRequirements: number;
  satisfiedCount: number;
  blockingFailureCount: number;
  results: IngredientRequirementResult[];
  blockingFailures: IngredientRequirementResult[];
  missingRequired: IngredientRequirementResult[];
  insufficientRequired: IngredientRequirementResult[];
  unresolvedRequired: IngredientRequirementResult[];
  omittedOptional: IngredientRequirementResult[];
  substitutionsApplied: IngredientRequirementResult[];
  failureReasons: string[];

  // Backwards-compatible legacy properties
  items: ReadinessItem[];
  missingRequiredIds: string[];
  missingOptionalIds: string[];
}

export interface EvaluateRecipeReadinessParams {
  recipe: Recipe;
  servings?: number;
  pantry: PantryItemInput[];
  substitutions?: SubstitutionSelection[] | Record<string, string>;
  options?: Omit<ReadinessEvaluationOptions, "substitutions">;
}

/**
 * Evaluates whether an ingredient line requirement can block recipe readiness.
 * Optional ingredients never block.
 * Garnish ingredients do not block unless explicit recipe rules forbid omission
 * (e.g. garnishRequired: true or non-omissible constraint).
 */
export function isRequirementBlocking(
  line: Pick<RecipeIngredient, "role" | "constraint" | "garnishRequired">,
  options?: ReadinessEvaluationOptions,
): boolean {
  if (line.role === "required" || line.role === "substitutable") {
    return true;
  }
  if (line.role === "optional") {
    return false;
  }
  if (line.role === "garnish") {
    if (options?.requireGarnish) return true;
    if (line.garnishRequired) return true;
    if (
      line.constraint &&
      /\b(mandatory|essential|cannot be omitted|required|non-negotiable)\b/i.test(line.constraint)
    ) {
      return true;
    }
    return false;
  }
  return true;
}

/**
 * Pure evaluation for a single ingredient requirement line against reported pantry input.
 */
export function evaluateIngredientRequirement(
  line: ScaledLine | RecipeIngredient,
  pantryInput?: PantryItemInput,
  activeSubstituteId?: string,
  options?: ReadinessEvaluationOptions,
): IngredientRequirementResult {
  const nameMap =
    options?.ingredientNames instanceof Map
      ? options.ingredientNames
      : options?.ingredientNames
        ? new Map(Object.entries(options.ingredientNames))
        : new Map<string, string>();

  const name = nameMap.get(line.ingredientId) ?? line.ingredientId;
  const substitutes = line.substitutes ?? [];
  const requiredQuantity = "scaledQuantity" in line ? line.scaledQuantity : line.quantity;
  const requiredUnit = line.unit ?? null;
  const canBlock = isRequirementBlocking(line, options);

  const baseResult: Omit<
    IngredientRequirementResult,
    | "isBlocking"
    | "satisfied"
    | "missing"
    | "insufficient"
    | "shortageQuantity"
    | "shortageUnit"
    | "availableQuantity"
    | "availableUnit"
    | "status"
    | "needsConfirmation"
    | "explanation"
  > = {
    lineId: line.id,
    ingredientId: line.ingredientId,
    ingredientName: name,
    role: line.role,
    requiredQuantity,
    requiredUnit,
    availableSubstitutes: substitutes,
    notes: line.note,
  };

  // 1. Data Validation: Detect invalid requirement or pantry inputs
  const validRoles: IngredientRole[] = ["required", "optional", "substitutable", "garnish"];
  if (!validRoles.includes(line.role)) {
    return {
      ...baseResult,
      isBlocking: true,
      satisfied: false,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: null,
      availableQuantity: null,
      availableUnit: null,
      status: "unresolved",
      unresolvedReason: "invalid-data",
      needsConfirmation: true,
      explanation: `${name}: Invalid requirement role '${line.role}'.`,
    };
  }

  if (requiredQuantity !== null && (!Number.isFinite(requiredQuantity) || requiredQuantity < 0)) {
    return {
      ...baseResult,
      isBlocking: true,
      satisfied: false,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: null,
      availableQuantity: null,
      availableUnit: null,
      status: "unresolved",
      unresolvedReason: "invalid-data",
      needsConfirmation: true,
      explanation: `${name}: Invalid requirement quantity (${requiredQuantity}).`,
    };
  }

  if (
    pantryInput?.haveQty != null &&
    (!Number.isFinite(pantryInput.haveQty) || pantryInput.haveQty < 0)
  ) {
    return {
      ...baseResult,
      isBlocking: canBlock,
      satisfied: false,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: null,
      availableQuantity: null,
      availableUnit: null,
      status: "unresolved",
      unresolvedReason: "invalid-data",
      needsConfirmation: true,
      explanation: `${name}: Invalid reported quantity (${pantryInput.haveQty}).`,
    };
  }

  // 2. Substitution Check: If user does not have original, check for approved substitution
  if ((!pantryInput || !pantryInput.have) && activeSubstituteId) {
    const isApproved = substitutes.includes(activeSubstituteId);
    const subName = nameMap.get(activeSubstituteId) ?? activeSubstituteId;

    if (isApproved) {
      return {
        ...baseResult,
        isBlocking: false,
        satisfied: true,
        missing: false,
        insufficient: false,
        shortageQuantity: null,
        shortageUnit: null,
        availableQuantity: null,
        availableUnit: null,
        status: "substitute-satisfied",
        needsConfirmation: false,
        substitutedBy: {
          ingredientId: activeSubstituteId,
          ingredientName: subName,
          approved: true,
        },
        explanation: `${name}: Satisfied using approved substitute '${subName}'.`,
      };
    } else {
      return {
        ...baseResult,
        isBlocking: canBlock,
        satisfied: false,
        missing: true,
        insufficient: false,
        shortageQuantity: requiredQuantity,
        shortageUnit: requiredUnit,
        availableQuantity: null,
        availableUnit: null,
        status: "missing",
        needsConfirmation: false,
        substitutedBy: {
          ingredientId: activeSubstituteId,
          ingredientName: subName,
          approved: false,
        },
        explanation: `${name}: Substitute '${subName}' is not approved for this recipe. Approved substitutes: ${
          substitutes.join(", ") || "none"
        }.`,
      };
    }
  }

  // 3. Missing Check: Not on hand and not substituted
  if (!pantryInput || !pantryInput.have) {
    const reasonText =
      line.role === "substitutable" && substitutes.length > 0
        ? `${name}: Missing substitutable ingredient. Approved alternatives: ${substitutes.join(", ")}.`
        : `${name}: Missing ${line.role} ingredient.`;

    return {
      ...baseResult,
      isBlocking: canBlock,
      satisfied: false,
      missing: true,
      insufficient: false,
      shortageQuantity: requiredQuantity,
      shortageUnit: requiredUnit,
      availableQuantity: 0,
      availableUnit: requiredUnit,
      status: "missing",
      needsConfirmation: false,
      explanation: reasonText,
    };
  }

  // 4. Quantity Evaluation: Line has null quantity (to-taste / qualitative)
  if (requiredQuantity === null) {
    return {
      ...baseResult,
      isBlocking: false,
      satisfied: true,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: null,
      availableQuantity: null,
      availableUnit: pantryInput.unit ?? null,
      status: "satisfied",
      needsConfirmation: false,
      explanation: `${name}: On hand to taste.`,
    };
  }

  // 5. Quantity Evaluation: User reported 'have: true' without specific quantity
  if (pantryInput.haveQty == null) {
    if (options?.strictQuantities) {
      return {
        ...baseResult,
        isBlocking: canBlock,
        satisfied: false,
        missing: false,
        insufficient: false,
        shortageQuantity: null,
        shortageUnit: requiredUnit,
        availableQuantity: null,
        availableUnit: null,
        status: "unresolved",
        unresolvedReason: "unverified-quantity",
        needsConfirmation: true,
        explanation: `${name}: Reported on hand, but quantity was unverified (needs ${requiredQuantity} ${
          requiredUnit ?? ""
        }).`,
      };
    }

    return {
      ...baseResult,
      isBlocking: false,
      satisfied: true,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: requiredUnit,
      availableQuantity: null,
      availableUnit: null,
      status: "satisfied",
      needsConfirmation: true,
      explanation: `${name}: Confirmed on hand without exact quantity verification.`,
    };
  }

  // 6. Unit Compatibility & Conversion Check
  const normalizedAvailable = convertUnitQuantity(
    pantryInput.haveQty,
    pantryInput.unit,
    requiredUnit,
  );

  if (normalizedAvailable === null) {
    // Incompatible units without safe conversion
    return {
      ...baseResult,
      isBlocking: canBlock,
      satisfied: false,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: requiredUnit,
      availableQuantity: null,
      availableUnit: pantryInput.unit ?? null,
      status: "unresolved",
      unresolvedReason: "incompatible-units",
      needsConfirmation: true,
      explanation: `${name}: Incompatible units (${pantryInput.unit ?? "unknown"} cannot be converted to required ${
        requiredUnit ?? "unknown"
      }). Requires manual confirmation.`,
    };
  }

  // 7. Quantity Comparison
  if (normalizedAvailable >= requiredQuantity) {
    return {
      ...baseResult,
      isBlocking: false,
      satisfied: true,
      missing: false,
      insufficient: false,
      shortageQuantity: null,
      shortageUnit: requiredUnit,
      availableQuantity: normalizedAvailable,
      availableUnit: requiredUnit,
      status: "satisfied",
      needsConfirmation: false,
      explanation: `${name}: Sufficient quantity (${pantryInput.haveQty} ${
        pantryInput.unit ?? ""
      } satisfies ${requiredQuantity} ${requiredUnit ?? ""}).`,
    };
  }

  // Insufficient quantity
  const shortage = dedust(requiredQuantity - normalizedAvailable);
  return {
    ...baseResult,
    isBlocking: canBlock,
    satisfied: false,
    missing: false,
    insufficient: true,
    shortageQuantity: shortage,
    shortageUnit: requiredUnit,
    availableQuantity: normalizedAvailable,
    availableUnit: requiredUnit,
    status: "insufficient",
    needsConfirmation: false,
    explanation: `${name}: Insufficient quantity. Need ${requiredQuantity} ${
      requiredUnit ?? ""
    }, but only ${pantryInput.haveQty} ${pantryInput.unit ?? ""} available (short ${shortage} ${
      requiredUnit ?? ""
    }).`,
  };
}

/**
 * Reusable evaluation of recipe ingredient requirements and cooking readiness.
 * Automatically respects serving adjustment by scaling recipe lines.
 */
export function evaluateRecipeReadiness({
  recipe,
  servings,
  pantry,
  substitutions,
  options,
}: EvaluateRecipeReadinessParams): RecipeReadinessReport {
  const targetServings = servings ?? recipe.baseServings;
  const scaledLines = scaleRecipe(recipe, targetServings);

  // Parse substitutions map
  const subMap = new Map<string, string>();
  if (Array.isArray(substitutions)) {
    for (const s of substitutions) {
      subMap.set(s.lineId, s.substituteIngredientId);
    }
  } else if (substitutions) {
    for (const [k, v] of Object.entries(substitutions)) {
      subMap.set(k, v);
    }
  }

  // Map pantry by line ID or catalog ingredient ID
  const pantryByLine = new Map<string, PantryItemInput>();
  const pantryByIngredient = new Map<string, PantryItemInput>();
  for (const p of pantry) {
    pantryByLine.set(p.ingredientId, p);
    pantryByIngredient.set(p.ingredientId, p);
  }

  const results: IngredientRequirementResult[] = [];
  const blockingFailures: IngredientRequirementResult[] = [];
  const missingRequired: IngredientRequirementResult[] = [];
  const insufficientRequired: IngredientRequirementResult[] = [];
  const unresolvedRequired: IngredientRequirementResult[] = [];
  const omittedOptional: IngredientRequirementResult[] = [];
  const substitutionsApplied: IngredientRequirementResult[] = [];

  for (const line of scaledLines) {
    const pantryInput = pantryByLine.get(line.id) ?? pantryByIngredient.get(line.ingredientId);
    const activeSub = subMap.get(line.id) ?? subMap.get(line.ingredientId);

    const result = evaluateIngredientRequirement(line, pantryInput, activeSub, options);
    results.push(result);

    if (result.status === "substitute-satisfied") {
      substitutionsApplied.push(result);
    }

    if (result.isBlocking && !result.satisfied) {
      blockingFailures.push(result);
      if (result.status === "missing") {
        missingRequired.push(result);
      } else if (result.status === "insufficient") {
        insufficientRequired.push(result);
      } else if (result.status === "unresolved") {
        unresolvedRequired.push(result);
      }
    } else if (!result.isBlocking && !result.satisfied) {
      omittedOptional.push(result);
    }
  }

  const ready = blockingFailures.length === 0;
  const failureReasons = blockingFailures.map((f) => f.explanation);

  // Map results to legacy ReadinessItem[] for backwards compatibility
  const legacyItems: ReadinessItem[] = results.map((r) => {
    let legacyStatus: ItemStatus = "have";
    if (r.status === "substitute-satisfied") {
      legacyStatus = "substitute-ok";
    } else if (r.status === "unresolved") {
      legacyStatus = "unresolved";
    } else if (!r.satisfied) {
      legacyStatus = r.isBlocking ? "need" : "optional-missing";
    }

    return {
      ingredientId: r.lineId,
      status: legacyStatus,
      needQty: r.shortageQuantity,
      approximate: r.status === "unresolved",
      unresolvedReason: r.unresolvedReason,
    };
  });

  return {
    ready,
    servings: targetServings,
    totalRequirements: scaledLines.length,
    satisfiedCount: results.filter((r) => r.satisfied).length,
    blockingFailureCount: blockingFailures.length,
    results,
    blockingFailures,
    missingRequired,
    insufficientRequired,
    unresolvedRequired,
    omittedOptional,
    substitutionsApplied,
    failureReasons,
    items: legacyItems,
    missingRequiredIds: missingRequired.map((m) => m.lineId),
    missingOptionalIds: omittedOptional.map((m) => m.lineId),
  };
}

/**
 * Legacy adapter for evaluateReadiness(scaledLines, pantry).
 * Maintains backwards compatibility while leveraging the validated requirements engine.
 */
export function evaluateReadiness(
  scaledLines: ScaledLine[],
  pantry: PantryInput[],
  substitutions?: SubstitutionSelection[] | Record<string, string>,
  options?: { allowUnitMismatchFallback?: boolean },
): {
  ready: boolean;
  items: ReadinessItem[];
  missingRequired: string[];
  missingOptional: string[];
  report: RecipeReadinessReport;
} {
  const allowFallback = options?.allowUnitMismatchFallback !== false;
  const subMap = new Map<string, string>();
  if (Array.isArray(substitutions)) {
    for (const s of substitutions) {
      subMap.set(s.lineId, s.substituteIngredientId);
    }
  } else if (substitutions) {
    for (const [k, v] of Object.entries(substitutions)) {
      subMap.set(k, v);
    }
  }

  const pantryByLine = new Map<string, PantryItemInput>();
  const pantryByIngredient = new Map<string, PantryItemInput>();
  for (const p of pantry) {
    pantryByLine.set(p.ingredientId, p);
    pantryByIngredient.set(p.ingredientId, p);
  }

  const results: IngredientRequirementResult[] = [];
  const missingRequiredList: string[] = [];
  const missingOptionalList: string[] = [];

  for (const line of scaledLines) {
    const pantryInput = pantryByLine.get(line.id) ?? pantryByIngredient.get(line.ingredientId);
    const activeSub = subMap.get(line.id) ?? subMap.get(line.ingredientId);

    const result = evaluateIngredientRequirement(line, pantryInput, activeSub);
    results.push(result);

    const isUnitMismatchTolerated =
      allowFallback &&
      result.status === "unresolved" &&
      result.unresolvedReason === "incompatible-units" &&
      !!pantryInput?.have;

    if (result.isBlocking && !result.satisfied && !isUnitMismatchTolerated) {
      missingRequiredList.push(line.id);
    } else if (!result.isBlocking && !result.satisfied && !isUnitMismatchTolerated) {
      missingOptionalList.push(line.id);
    }
  }

  const legacyItems: ReadinessItem[] = results.map((r) => {
    let legacyStatus: ItemStatus = "have";
    let approx = false;

    if (r.status === "substitute-satisfied") {
      legacyStatus = "substitute-ok";
    } else if (r.status === "unresolved") {
      if (allowFallback && r.unresolvedReason === "incompatible-units") {
        legacyStatus = "have";
        approx = true;
      } else {
        legacyStatus = "unresolved";
        approx = true;
      }
    } else if (!r.satisfied) {
      legacyStatus = r.isBlocking ? "need" : "optional-missing";
    }

    return {
      ingredientId: r.lineId,
      status: legacyStatus,
      needQty: approx ? null : r.shortageQuantity,
      approximate: approx,
      unresolvedReason: r.unresolvedReason,
    };
  });

  const ready = missingRequiredList.length === 0;

  return {
    ready,
    items: legacyItems,
    missingRequired: missingRequiredList,
    missingOptional: missingOptionalList,
    report: {
      ready,
      servings: 1,
      totalRequirements: scaledLines.length,
      satisfiedCount: results.filter((r) => r.satisfied).length,
      blockingFailureCount: missingRequiredList.length,
      results,
      blockingFailures: results.filter((r) => r.isBlocking && !r.satisfied),
      missingRequired: results.filter((r) => r.isBlocking && r.status === "missing"),
      insufficientRequired: results.filter((r) => r.isBlocking && r.status === "insufficient"),
      unresolvedRequired: results.filter((r) => r.isBlocking && r.status === "unresolved"),
      omittedOptional: results.filter((r) => !r.isBlocking && !r.satisfied),
      substitutionsApplied: results.filter((r) => r.status === "substitute-satisfied"),
      failureReasons: results.filter((r) => r.isBlocking && !r.satisfied).map((r) => r.explanation),
      items: legacyItems,
      missingRequiredIds: missingRequiredList,
      missingOptionalIds: missingOptionalList,
    },
  };
}

/**
 * Resolve substitute-ok after evaluation: a substitutable line marked
 * need becomes substitute-ok when the cook confirms one of its
 * chef-approved substitutes.
 */
export function applySubstitute<
  T extends {
    items: ReadinessItem[];
    missingRequired: string[];
    missingOptional: string[];
    ready: boolean;
  },
>(report: T, lineId: string, substituteName: string, allowedSubstitutes: string[]): T {
  if (!allowedSubstitutes.includes(substituteName)) return report;
  const items = report.items.map((item) =>
    item.ingredientId === lineId && item.status === "need"
      ? { ...item, status: "substitute-ok" as const, needQty: null }
      : item,
  );
  const missingRequired = report.missingRequired.filter((id) => id !== lineId);
  return {
    ...report,
    items,
    missingRequired,
    ready: missingRequired.length === 0,
  };
}
