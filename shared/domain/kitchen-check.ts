import { z } from "zod";
import { recipeSchema, type IngredientRole, type Recipe } from "./recipe-schema";
import {
  evaluateRecipeReadiness,
  type IngredientRequirementResult,
  type PantryItemInput,
} from "./readiness";
import { clampServings, scaleRecipe, type ScaledLine } from "./scaling";
import {
  aisleForCatalogCategory,
  mergeRecipeNeeds,
  type MergeResult,
  type RecipeNeed,
  type ShoppingItem,
} from "./shopping";
import {
  UNITS,
  dedust,
  formatQuantity,
  parseQuantityText,
  type ParsedQuantity,
  type Unit,
} from "./units";

/**
 * Kitchen Check (Stage 4). The cook reports what they have; all
 * requirement and quantity rules stay in `readiness.ts`. This module
 * only adds what the screen needs on top of it:
 *
 * - a persisted, per-context record of what the cook entered,
 * - tolerant quantity parsing (no unit conversion is invented),
 * - a presentation state per line that never treats "not asked yet"
 *   as "missing",
 * - the gate for Start cooking and the shortage list for shopping.
 */

/* ------------------------------------------------------------------ */
/* Persisted input                                                    */
/* ------------------------------------------------------------------ */

export const kitchenCheckEntrySchema = z.object({
  /** `true` = the cook says they have it; `false` = they do not. */
  have: z.boolean(),
  /** Raw text as typed; parsed on every evaluation, never trusted. */
  qtyText: z.string().max(20).default(""),
  /** Unit the amount was entered in. Null for count-less lines. */
  unit: z.string().max(20).nullable().default(null),
});

export type KitchenCheckEntry = z.infer<typeof kitchenCheckEntrySchema>;

export const kitchenCheckRecordSchema = z.object({
  /** `kitchenCheckKey(recipeId, contentVersion, servings)` */
  key: z.string().min(1).max(200),
  recipeId: z.string().min(1).max(100),
  servings: z.number().int().min(1).max(24),
  /** Keyed by recipe ingredient *line* id. Absent = not checked. */
  entries: z.record(z.string(), kitchenCheckEntrySchema),
  /** Line id -> approved substitute ingredient id. */
  substitutions: z.record(z.string(), z.string()).default({}),
  updatedAt: z.number().int().nonnegative(),
});

export type KitchenCheckRecord = z.infer<typeof kitchenCheckRecordSchema>;

/** The check is scoped to one recipe version at one serving count. */
export function kitchenCheckKey(
  recipe: Pick<Recipe, "id" | "contentVersion">,
  servings: number,
): string {
  return `${recipe.id}@v${recipe.contentVersion}:${servings}`;
}

export const MAX_STORED_CHECKS = 20;

/** Insert/replace one record, keeping only the most recent contexts. */
export function upsertRecord(
  all: KitchenCheckRecord[],
  record: KitchenCheckRecord,
): KitchenCheckRecord[] {
  const rest = all.filter((r) => r.key !== record.key);
  return [...rest, record].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_STORED_CHECKS);
}

/* ------------------------------------------------------------------ */
/* Servings carried from the recipe page                              */
/* ------------------------------------------------------------------ */

export interface ResolvedServings {
  servings: number;
  /** True when the incoming value was missing/invalid/out of range. */
  adjusted: boolean;
}

/** Same ceiling `scaleRecipe` applies, so quantities and label always agree. */
export function maxServingsFor(recipe: Pick<Recipe, "baseServings">): number {
  return Math.max(12, recipe.baseServings);
}

/**
 * Resolve the `?servings=` param. A missing param is not an error
 * (direct link) and falls back to the recipe's base servings; a bad or
 * out-of-range value is clamped and flagged so the UI can say so
 * instead of silently changing the count.
 */
export function resolveServings(
  raw: string | null | undefined,
  recipe: Pick<Recipe, "baseServings">,
): ResolvedServings {
  const max = maxServingsFor(recipe);
  if (raw === null || raw === undefined || raw === "") {
    return { servings: clampServings(recipe.baseServings, 1, max), adjusted: false };
  }
  const trimmed = raw.trim();
  if (!/^\d{1,3}$/.test(trimmed)) {
    return { servings: clampServings(recipe.baseServings, 1, max), adjusted: true };
  }
  const n = Number(trimmed);
  const servings = clampServings(n, 1, max);
  return { servings, adjusted: servings !== n };
}

/* ------------------------------------------------------------------ */
/* Quantity text                                                      */
/* ------------------------------------------------------------------ */

export { parseQuantityText, type ParsedQuantity } from "./units";

/* ------------------------------------------------------------------ */
/* Row state                                                          */
/* ------------------------------------------------------------------ */

export type RowState =
  | "not-checked"
  | "have-enough"
  | "not-enough"
  | "missing"
  | "optional"
  | "alternative"
  | "needs-review";

export const ROW_STATE_LABEL: Record<RowState, string> = {
  "not-checked": "Not checked",
  "have-enough": "Have enough",
  "not-enough": "Not enough",
  missing: "Missing",
  optional: "Optional, skipping",
  alternative: "Using approved alternative",
  "needs-review": "Needs review",
};

export const ROLE_LABEL: Record<IngredientRole, string> = {
  required: "Required",
  optional: "Optional",
  substitutable: "Swappable",
  garnish: "Garnish",
};

export interface KitchenCheckRow {
  lineId: string;
  ingredientId: string;
  name: string;
  role: IngredientRole;
  roleLabel: string;
  /** Short explanation of whether the line can be left out. */
  roleHint: string;
  /** Can the cook leave this out and still cook? Mirrors domain rules. */
  isBlocking: boolean;
  preparation?: string;
  note?: string;
  constraint?: string;
  requiredQuantity: number | null;
  requiredUnit: string | null;
  /** Formatted, scaled requirement (e.g. "400 g", "to taste"). */
  requiredDisplay: string;
  approximate: boolean;
  entry: KitchenCheckEntry | null;
  /** Amount the cook entered, already validated. */
  haveQuantity: number | null;
  haveUnit: string | null;
  inputError: string | null;
  state: RowState;
  /** Shortage in the *recipe's* unit when it can be compared. */
  shortageQuantity: number | null;
  /** What the cook has, in the recipe's unit, formatted. Null when not comparable. */
  availableDisplay: string | null;
  /** Formatted shortage ("2 cup"), only when state is not-enough or missing. */
  shortageDisplay: string | null;
  /** Ingredient ids the recipe explicitly approves as alternatives. */
  approvedSubstitutes: string[];
  substitutedBy: string | null;
  /** One line explaining the state, from the domain engine. */
  explanation: string;
  /** The recipe's own data for this line is invalid; nothing the cook enters can fix it. */
  dataInvalid: boolean;
}

export interface KitchenCheckSummary {
  total: number;
  checked: number;
  /** Blocking lines that are checked and still unmet (missing / short / review). */
  needAttention: number;
  /** Blocking lines the cook has not answered yet. */
  unchecked: number;
  /** Lines that need shopping (marked missing or short, and not swapped). */
  toShop: number;
}

export interface CookGate {
  canStart: boolean;
  /** Why not. Null when `canStart`. */
  reason: string | null;
}

export interface KitchenCheckView {
  servings: number;
  rows: KitchenCheckRow[];
  summary: KitchenCheckSummary;
  /** Full readiness verdict. The only source of truth for Start cooking. */
  readiness: CookingReadiness;
  /** Convenience projection of `readiness` for simple consumers. */
  gate: CookGate;
}

function roleHint(
  line: Pick<ScaledLine, "role" | "garnishRequired" | "constraint">,
  blocking: boolean,
) {
  switch (line.role) {
    case "required":
      return "Needed. This recipe doesn't work without it.";
    case "substitutable":
      return "Needed, but only an approved alternative can stand in.";
    case "optional":
      return "Optional. Fine to leave out.";
    case "garnish":
      return blocking ? "Garnish, but this recipe asks for it." : "Garnish. Can be left out.";
  }
}

export interface BuildViewArgs {
  recipe: Recipe;
  servings: number;
  record: Pick<KitchenCheckRecord, "entries" | "substitutions"> | null;
  ingredientNames: Record<string, string>;
}

/**
 * Evaluate one check. Unanswered lines are passed to the domain
 * engine as absent, then reported as "not-checked" — never "missing".
 */
export function buildKitchenCheckView({
  recipe,
  servings,
  record,
  ingredientNames,
}: BuildViewArgs): KitchenCheckView {
  const entries = record?.entries ?? {};
  const substitutions = record?.substitutions ?? {};
  const scaled = scaleRecipe(recipe, servings);

  const parsed = new Map<string, ParsedQuantity>();
  const pantry: PantryItemInput[] = [];
  const activeSubs: Record<string, string> = {};

  for (const line of scaled) {
    const entry = entries[line.id];
    if (!entry) continue;
    if (!entry.have) {
      pantry.push({ ingredientId: line.id, have: false });
      const sub = substitutions[line.id];
      if (sub && (line.substitutes ?? []).includes(sub)) activeSubs[line.id] = sub;
      continue;
    }
    const q = parseQuantityText(entry.qtyText);
    parsed.set(line.id, q);
    pantry.push({
      ingredientId: line.id,
      have: true,
      haveQty: q.kind === "ok" ? q.value : null,
      unit: entry.unit ?? line.unit,
    });
  }

  const report = evaluateRecipeReadiness({
    recipe,
    servings,
    pantry,
    substitutions: activeSubs,
    options: { strictQuantities: true, ingredientNames },
  });
  const resultByLine = new Map<string, IngredientRequirementResult>(
    report.results.map((r) => [r.lineId, r]),
  );

  const rows: KitchenCheckRow[] = scaled.map((line) => {
    const entry = entries[line.id] ?? null;
    const result = resultByLine.get(line.id)!;
    const q = parsed.get(line.id);
    const inputError = q?.kind === "invalid" ? q.message : null;
    const isBlocking = isLineBlocking(line);

    let state: RowState;
    if (result.unresolvedReason === "invalid-data" && !inputError) {
      state = "needs-review";
    } else if (!entry) {
      state = "not-checked";
    } else if (inputError) {
      state = "needs-review";
    } else if (result.status === "substitute-satisfied") {
      state = "alternative";
    } else if (result.status === "unresolved") {
      state = "needs-review";
    } else if (result.status === "insufficient") {
      state = "not-enough";
    } else if (result.status === "missing") {
      state = isBlocking ? "missing" : "optional";
    } else {
      state = "have-enough";
    }

    const subId = activeSubs[line.id];
    return {
      lineId: line.id,
      ingredientId: line.ingredientId,
      name: ingredientNames[line.ingredientId] ?? line.ingredientId,
      role: line.role,
      roleLabel: ROLE_LABEL[line.role],
      roleHint: roleHint(line, isBlocking),
      isBlocking,
      preparation: line.preparation,
      note: line.note,
      constraint: line.constraint,
      requiredQuantity: line.scaledQuantity,
      requiredUnit: line.unit,
      requiredDisplay: line.displayQuantity,
      approximate: line.approximate,
      entry,
      haveQuantity: q?.kind === "ok" ? q.value : null,
      haveUnit: entry?.unit ?? line.unit,
      inputError,
      state,
      shortageQuantity: state === "not-enough" ? result.shortageQuantity : null,
      availableDisplay: availableDisplayFor(state, result, line.unit),
      shortageDisplay: shortageDisplayFor(state, result, line.unit),
      approvedSubstitutes: line.substitutes ?? [],
      substitutedBy: subId ? (ingredientNames[subId] ?? subId) : null,
      explanation: result.explanation,
      dataInvalid: result.unresolvedReason === "invalid-data" && !inputError,
    };
  });

  const readiness = evaluateReadinessFromRows(
    rows,
    recipeSchema.safeParse(recipe).success,
    ingredientNames,
  );
  const checked = rows.filter((r) => r.state !== "not-checked").length;
  const needAttention = rows.filter(
    (r) =>
      r.isBlocking &&
      (r.state === "missing" || r.state === "not-enough" || r.state === "needs-review"),
  ).length;
  const unchecked = rows.filter((r) => r.isBlocking && r.state === "not-checked").length;
  const toShop = rows.filter(
    (r) => r.state === "missing" || r.state === "not-enough" || needsClarification(r),
  ).length;

  return {
    servings,
    rows,
    summary: { total: rows.length, checked, needAttention, unchecked, toShop },
    readiness,
    gate: { canStart: readiness.canStartCooking, reason: readiness.blockedReason },
  };
}

function availableDisplayFor(
  state: RowState,
  result: IngredientRequirementResult,
  unit: ScaledLine["unit"],
): string | null {
  if (state === "missing") return formatQuantity(0, unit as Unit | null);
  if (result.availableQuantity === null) return null;
  if (state !== "not-enough" && state !== "have-enough") return null;
  return formatQuantity(result.availableQuantity, unit as Unit | null);
}

function shortageDisplayFor(
  state: RowState,
  result: IngredientRequirementResult,
  unit: ScaledLine["unit"],
): string | null {
  if (state !== "not-enough" && state !== "missing") return null;
  if (result.shortageQuantity === null) return null;
  return formatQuantity(result.shortageQuantity, unit as Unit | null);
}

/** Garnish only blocks when the recipe says so; mirrors the domain rule. */
function isLineBlocking(line: Pick<ScaledLine, "role" | "garnishRequired" | "constraint">) {
  if (line.role === "required" || line.role === "substitutable") return true;
  if (line.role === "optional") return false;
  if (line.garnishRequired) return true;
  return Boolean(
    line.constraint &&
    /\b(mandatory|essential|cannot be omitted|required|non-negotiable)\b/i.test(line.constraint),
  );
}

/* ------------------------------------------------------------------ */
/* Cooking readiness (Phase 19)                                       */
/* ------------------------------------------------------------------ */

export const READINESS_STATUSES = [
  "NOT_CHECKED",
  "NEEDS_ATTENTION",
  "ALTERNATIVE_REVIEW",
  "READY",
  "REVIEW_REQUIRED",
] as const;

export type ReadinessStatus = (typeof READINESS_STATUSES)[number];

export type NextAction =
  "check-ingredients" | "shop" | "review-alternatives" | "review-amounts" | "start";

export interface CookingReadiness {
  status: ReadinessStatus;
  /** The only flag Start cooking may use. Derived here, never supplied by the UI. */
  canStartCooking: boolean;
  headline: string;
  /** Why starting is blocked. Null when ready. */
  blockedReason: string | null;
  nextAction: NextAction;
  /** Blocking lines the cook has not answered yet. */
  unchecked: KitchenCheckRow[];
  /** Blocking lines marked missing. */
  blockingMissing: KitchenCheckRow[];
  /** Blocking lines present but short. */
  insufficient: KitchenCheckRow[];
  /** Missing lines the recipe omits safely (optional, or garnish that may be skipped). */
  nonBlockingMissing: KitchenCheckRow[];
  /** Blocked lines for which the recipe lists an approved alternative not yet selected. */
  alternativesAvailable: KitchenCheckRow[];
  /** Lines whose requirement can't be compared or whose data is invalid. */
  unresolved: KitchenCheckRow[];
  /** Lines satisfied by an approved alternative the cook selected. */
  substitutionsApplied: KitchenCheckRow[];
  /** One plain sentence per line that affects the verdict. */
  explanations: string[];
}

function describeRow(row: KitchenCheckRow, names: (id: string) => string): string {
  const alt = row.approvedSubstitutes.map(names).join(" or ");
  switch (row.state) {
    case "not-checked":
      return `${row.name}: not checked yet.`;
    case "missing":
      return alt
        ? `${row.name}: missing. Approved alternative: ${alt}.`
        : row.role === "garnish"
          ? `${row.name}: missing, and this recipe doesn't allow leaving the garnish out.`
          : `${row.name}: missing, and it has no approved alternative.`;
    case "not-enough":
      return `${row.name}: need ${row.requiredDisplay}, have ${row.availableDisplay ?? "less"} (${
        row.shortageDisplay ?? "some"
      } short).`;
    case "needs-review":
      return row.dataInvalid
        ? `${row.name}: this recipe's data for the ingredient is invalid, so it can't be checked.`
        : `${row.name}: the amount can't be compared safely. ${row.inputError ?? "Enter it in the recipe's unit."}`;
    case "optional":
      return `${row.name}: ${row.role === "garnish" ? "garnish" : "optional"}, fine to leave out.`;
    case "alternative":
      return `${row.name}: using approved alternative ${row.substitutedBy}.`;
    case "have-enough":
      return `${row.name}: have enough.`;
  }
}

/**
 * Final readiness. Evaluated from the same rows the engine produced;
 * UI components render the result and never decide readiness.
 *
 * Precedence: unanswered blocking lines → data problems → hard
 * shortages → alternatives still to choose → ready.
 */
function evaluateReadinessFromRows(
  rows: KitchenCheckRow[],
  recipeValid: boolean,
  ingredientNames: Record<string, string>,
): CookingReadiness {
  const blocking = rows.filter((r) => r.isBlocking);
  const nameOf = (id: string) => ingredientNames[id] ?? id;
  const unchecked = blocking.filter((r) => r.state === "not-checked");
  const unresolved = rows.filter(
    (r) => r.state === "needs-review" && (r.isBlocking || r.dataInvalid),
  );
  const blockingMissing = blocking.filter((r) => r.state === "missing");
  const insufficient = blocking.filter((r) => r.state === "not-enough");
  const nonBlockingMissing = rows.filter((r) => !r.isBlocking && r.state === "optional");
  const substitutionsApplied = rows.filter((r) => r.state === "alternative");
  const alternativesAvailable = [...blockingMissing, ...insufficient].filter(
    (r) => r.approvedSubstitutes.length > 0 && r.role === "substitutable",
  );
  const hardShortages = [...blockingMissing, ...insufficient].filter(
    (r) => !alternativesAvailable.includes(r),
  );

  const base = {
    unchecked,
    blockingMissing,
    insufficient,
    nonBlockingMissing,
    alternativesAvailable,
    unresolved,
    substitutionsApplied,
  };
  const explanations = [
    ...unchecked,
    ...unresolved,
    ...blockingMissing,
    ...insufficient,
    ...substitutionsApplied,
    ...nonBlockingMissing,
  ].map((r) => describeRow(r, nameOf));

  const make = (
    status: ReadinessStatus,
    headline: string,
    blockedReason: string | null,
    nextAction: NextAction,
  ): CookingReadiness => ({
    status,
    canStartCooking: status === "READY",
    headline,
    blockedReason,
    nextAction,
    ...base,
    explanations,
  });

  if (!recipeValid || rows.length === 0) {
    const why =
      rows.length === 0
        ? "This recipe has no ingredient data."
        : "This recipe's data failed validation.";
    return make(
      "REVIEW_REQUIRED",
      "Can't confirm readiness",
      `${why} Cooking can't start safely.`,
      "review-amounts",
    );
  }

  if (unchecked.length > 0) {
    const n = unchecked.length;
    return make(
      "NOT_CHECKED",
      "Check your ingredients",
      n === 1
        ? "Check the last required ingredient to continue."
        : `Check ${n} more required ingredients to continue.`,
      "check-ingredients",
    );
  }

  if (unresolved.length > 0) {
    const n = unresolved.length;
    return make(
      "REVIEW_REQUIRED",
      "Some amounts need review",
      n === 1
        ? "One ingredient can't be compared safely. Review it to continue."
        : `${n} ingredients can't be compared safely. Review them to continue.`,
      "review-amounts",
    );
  }

  if (hardShortages.length > 0) {
    const n = hardShortages.length;
    return make(
      "NEEDS_ATTENTION",
      "Some ingredients are missing",
      n === 1
        ? "1 required ingredient is still missing or short."
        : `${n} required ingredients are still missing or short.`,
      "shop",
    );
  }

  if (alternativesAvailable.length > 0) {
    const n = alternativesAvailable.length;
    return make(
      "ALTERNATIVE_REVIEW",
      "Approved alternatives available",
      n === 1
        ? "1 ingredient is missing. Choose its approved alternative or shop for it."
        : `${n} ingredients are missing. Choose approved alternatives or shop for them.`,
      "review-alternatives",
    );
  }

  return make("READY", "Ready to cook", null, "start");
}

/**
 * Trusted entry point: evaluates readiness from the recipe, servings and
 * recorded answers alone. Callers must not pass or persist a readiness
 * verdict of their own.
 */
export function evaluateCookingReadiness(args: BuildViewArgs): CookingReadiness {
  return buildKitchenCheckView(args).readiness;
}

/* ------------------------------------------------------------------ */
/* Headline copy                                                      */
/* ------------------------------------------------------------------ */

/** Only reports numbers derived from the rows. */
export function readinessHeadline(summary: KitchenCheckSummary): {
  title: string;
  detail: string | null;
} {
  if (summary.checked === 0) {
    return { title: "Let's check your ingredients.", detail: null };
  }
  const title = `You've checked ${summary.checked} of ${summary.total} ingredients.`;
  if (summary.needAttention > 0) {
    return {
      title,
      detail: `${summary.needAttention} ${
        summary.needAttention === 1 ? "ingredient still needs" : "ingredients still need"
      } attention.`,
    };
  }
  if (summary.unchecked > 0) {
    return {
      title,
      detail: `${summary.unchecked} required ${
        summary.unchecked === 1 ? "ingredient" : "ingredients"
      } left to check.`,
    };
  }
  return { title, detail: "Everything required is covered." };
}

/* ------------------------------------------------------------------ */
/* Entry updates (pure)                                               */
/* ------------------------------------------------------------------ */

export function emptyRecord(
  recipe: Pick<Recipe, "id" | "contentVersion">,
  servings: number,
  now: number,
): KitchenCheckRecord {
  return {
    key: kitchenCheckKey(recipe, servings),
    recipeId: recipe.id,
    servings,
    entries: {},
    substitutions: {},
    updatedAt: now,
  };
}

export function withEntry(
  record: KitchenCheckRecord,
  lineId: string,
  entry: KitchenCheckEntry | null,
  now: number,
): KitchenCheckRecord {
  const entries = { ...record.entries };
  const substitutions = { ...record.substitutions };
  if (entry === null) {
    delete entries[lineId];
    delete substitutions[lineId];
  } else {
    entries[lineId] = entry;
    // A swap only makes sense for something the cook does not have.
    if (entry.have) delete substitutions[lineId];
  }
  return { ...record, entries, substitutions, updatedAt: now };
}

/**
 * Pick an approved alternative. Refused (record unchanged) unless the
 * recipe lists that substitute for the line — the UI can't invent one.
 */
export function withSubstitution(
  record: KitchenCheckRecord,
  recipe: Pick<Recipe, "ingredients">,
  lineId: string,
  substituteId: string | null,
  now: number,
): KitchenCheckRecord {
  const substitutions = { ...record.substitutions };
  if (substituteId === null) {
    delete substitutions[lineId];
    return { ...record, substitutions, updatedAt: now };
  }
  const line = recipe.ingredients.find((l) => l.id === lineId);
  if (!line || !(line.substitutes ?? []).includes(substituteId)) return record;
  substitutions[lineId] = substituteId;
  return {
    ...record,
    entries: { ...record.entries, [lineId]: { have: false, qtyText: "", unit: null } },
    substitutions,
    updatedAt: now,
  };
}

/** Units offered in the amount picker: the recipe's unit first. */
export function unitChoices(requiredUnit: string | null): string[] {
  const all = [...UNITS] as string[];
  if (!requiredUnit) return all;
  return [requiredUnit, ...all.filter((u) => u !== requiredUnit)];
}

/* ------------------------------------------------------------------ */
/* Shopping hand-off                                                  */
/* ------------------------------------------------------------------ */

/** Blocking lines Fork can't size a purchase for; they go on the list flagged. */
function needsClarification(r: KitchenCheckRow): boolean {
  return r.isBlocking && r.state === "needs-review" && r.entry !== null && !r.dataInvalid;
}

function clarificationText(r: KitchenCheckRow): string {
  const entered = r.entry?.qtyText.trim() ?? "";
  if (r.inputError)
    return `Your amount "${entered}" couldn't be read. The recipe needs ${r.requiredDisplay}.`;
  if (entered === "")
    return `Amount on hand wasn't entered. The recipe needs ${r.requiredDisplay}.`;
  return `You have ${entered} ${r.entry?.unit ?? ""}, which can't be compared with ${r.requiredDisplay}. Check how much to buy.`.replace(
    /\s+,/,
    ",",
  );
}

/** What the current check says must be bought. Unchecked lines are never included. */
export function recipeNeedsFromRows(rows: KitchenCheckRow[]): {
  needs: RecipeNeed[];
  resolvedLineIds: string[];
} {
  const needs: RecipeNeed[] = [];
  for (const r of rows) {
    if (r.state === "missing" || r.state === "not-enough") {
      const qty = r.state === "not-enough" ? r.shortageQuantity : r.requiredQuantity;
      needs.push({
        lineId: r.lineId,
        ingredientId: r.ingredientId,
        name: r.name,
        qty,
        unit: qty === null ? null : r.requiredUnit,
        requiredQty: r.requiredQuantity,
        availableQty:
          r.state === "missing"
            ? 0
            : r.requiredQuantity !== null && r.shortageQuantity !== null
              ? dedust(r.requiredQuantity - r.shortageQuantity)
              : null,
        needsClarification: false,
      });
    } else if (needsClarification(r)) {
      needs.push({
        lineId: r.lineId,
        ingredientId: r.ingredientId,
        name: r.name,
        qty: null,
        unit: r.requiredUnit,
        requiredQty: r.requiredQuantity,
        availableQty: null,
        needsClarification: true,
        clarification: clarificationText(r),
      });
    }
  }
  const resolvedLineIds = rows
    .filter((r) => r.state === "have-enough" || r.state === "alternative" || r.state === "optional")
    .map((r) => r.lineId);
  return { needs, resolvedLineIds };
}

/**
 * Put this check's shortages on the shopping list. Re-running it
 * updates the same items rather than duplicating them (see
 * `mergeRecipeNeeds`). Never touches the Kitchen Check record.
 */
export function addShortagesToList(
  existing: ShoppingItem[],
  args: {
    recipe: Pick<Recipe, "id" | "slug"> & Partial<Pick<Recipe, "title">>;
    servings: number;
    rows: KitchenCheckRow[];
    now: number;
    /** Catalog category per ingredient id; used only through an explicit aisle table. */
    ingredientCategories?: Record<string, string | undefined>;
  },
): MergeResult {
  const { needs: raw, resolvedLineIds } = recipeNeedsFromRows(args.rows);
  const needs = raw.map((n) => ({
    ...n,
    category: aisleForCatalogCategory(args.ingredientCategories?.[n.ingredientId]),
  }));
  return mergeRecipeNeeds(existing, {
    recipeId: args.recipe.id,
    recipeSlug: args.recipe.slug,
    recipeTitle: args.recipe.title,
    servings: args.servings,
    needs,
    resolvedLineIds,
    now: args.now,
  });
}
