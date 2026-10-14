import { z } from "zod";
import type { ScaledLine } from "./scaling";
import { UNITS, convertUnitQuantity, dedust, parseQuantityText } from "./units";

/**
 * One shopping list per device in MVP. Items carry provenance
 * (which recipe + servings produced them) but quantities are
 * snapshots — changing servings later never rewrites history.
 */

/** A deliberately small set of aisles. Only set from catalog data or by the cook. */
export const SHOPPING_CATEGORIES = ["produce", "grains", "proteins", "other"] as const;
export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<ShoppingCategory, string> = {
  produce: "Produce",
  grains: "Grains and staples",
  proteins: "Proteins",
  other: "Other",
};

/**
 * Catalog category → aisle. Explicit table; anything not listed stays
 * uncategorised rather than being guessed.
 */
const CATALOG_TO_AISLE: Record<string, ShoppingCategory> = {
  produce: "produce",
  vegetables: "produce",
  fruit: "produce",
  fruits: "produce",
  herbs: "produce",
  grains: "grains",
  staples: "grains",
  flour: "grains",
  legumes: "grains",
  protein: "proteins",
  proteins: "proteins",
  meat: "proteins",
  poultry: "proteins",
  fish: "proteins",
  seafood: "proteins",
};

export function aisleForCatalogCategory(
  category: string | undefined,
): ShoppingCategory | undefined {
  return category ? CATALOG_TO_AISLE[category.toLowerCase()] : undefined;
}

export const shoppingItemSchema = z.object({
  id: z.string().min(1).max(100),
  origin: z.enum(["recipe", "personal"]),
  recipeId: z.string().min(1).max(100).optional(),
  recipeSlug: z.string().min(1).max(120).optional(),
  ingredientId: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(20).nullable(),
  qty: z.number().positive().nullable(),
  servingsContext: z.number().int().min(1).max(24).optional(),
  checked: z.boolean().default(false),
  createdAt: z.number().int().nonnegative(),
  /** Recipe line this need came from (recipe items). */
  lineId: z.string().min(1).max(100).optional(),
  recipeTitle: z.string().min(1).max(200).optional(),
  /** What the recipe needs at `servingsContext`, kept apart from `qty` (what to buy). */
  requiredQty: z.number().nonnegative().nullable().optional(),
  /** What the cook said they had, in `unit`. */
  availableQty: z.number().nonnegative().nullable().optional(),
  /** The amount to buy couldn't be worked out; `qty` is null on purpose. */
  needsClarification: z.boolean().default(false),
  /** System explanation shown with a clarification item. */
  clarification: z.string().max(300).optional(),
  /** The cook's own note. Never overwritten by regeneration. */
  notes: z.string().max(300).optional(),
  /** Aisle, from the catalog or chosen by the cook. Absent = uncategorised. */
  category: z.enum(SHOPPING_CATEGORIES).optional(),
  /** The cook edited name/quantity/unit; regeneration won't overwrite them. */
  userEdited: z.boolean().optional(),
  updatedAt: z.number().int().nonnegative().optional(),
});

export type ShoppingItem = z.infer<typeof shoppingItemSchema>;

export const shoppingListSchema = z.object({
  id: z.string().min(1).max(100),
  ownerId: z.string().min(1).max(100),
  items: z.array(shoppingItemSchema).max(500),
  updatedAt: z.number().int().nonnegative(),
});

export type ShoppingList = z.infer<typeof shoppingListSchema>;

/**
 * Derive recipe-origin items for lines still needed. Same
 * ingredient + same servings aggregate; different servings stay
 * separate lines so quantities never silently merge.
 */
export function deriveRecipeItems(
  existing: ShoppingItem[],
  args: {
    recipeId: string;
    recipeSlug: string;
    servings: number;
    lines: Array<
      Pick<ScaledLine, "id" | "ingredientId" | "scaledQuantity" | "unit"> & { name: string }
    >;
    now: number;
  },
): ShoppingItem[] {
  let next: ShoppingItem[] = [...existing];
  const makeId = (lineId: string) => `shop:${args.recipeId}:${args.servings}:${lineId}`;

  for (const line of args.lines) {
    const qty = line.scaledQuantity;
    if (qty === null) continue;
    const id = makeId(line.id);
    const found = next.find((item) => item.id === id);
    if (found && found.origin === "recipe") {
      next = next.map((item) => (item.id === id ? { ...item, qty: (item.qty ?? 0) + qty } : item));
    } else if (!found) {
      next.push({
        id,
        origin: "recipe",
        recipeId: args.recipeId,
        recipeSlug: args.recipeSlug,
        ingredientId: line.ingredientId,
        name: line.name,
        unit: line.unit,
        qty: line.scaledQuantity,
        servingsContext: args.servings,
        checked: false,
        needsClarification: false,
        createdAt: args.now,
      });
    }
  }
  return shoppingListSchema.shape.items.parse(next);
}

export function createPersonalItem(args: {
  id: string;
  name: string;
  qty?: number | null;
  unit?: string | null;
  now: number;
}): ShoppingItem {
  return shoppingItemSchema.parse({
    id: args.id,
    origin: "personal",
    name: args.name.trim(),
    qty: args.qty ?? null,
    unit: args.unit ?? null,
    checked: false,
    createdAt: args.now,
  });
}

export function toggleItemChecked(
  list: ShoppingList,
  itemId: string,
  now: number = Date.now(),
): ShoppingList {
  return {
    ...list,
    updatedAt: now,
    items: list.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item,
    ),
  };
}

/* ------------------------------------------------------------------ */
/* Recipe needs (Kitchen Check → list)                                */
/* ------------------------------------------------------------------ */

/** One thing a recipe still needs, as worked out by Kitchen Check. */
export interface RecipeNeed {
  lineId: string;
  ingredientId: string;
  name: string;
  /** Amount to buy. Null for "to taste" lines and clarification items. */
  qty: number | null;
  unit: string | null;
  requiredQty: number | null;
  availableQty: number | null;
  needsClarification: boolean;
  clarification?: string;
  category?: ShoppingCategory;
}

export interface MergeResult {
  items: ShoppingItem[];
  added: number;
  updated: number;
  unchanged: number;
  /** Unbought items dropped because the recipe no longer needs them. */
  removed: number;
}

export function recipeItemId(recipeId: string, lineId: string): string {
  return `shop:${recipeId}:${lineId}`;
}

/** Also matches Phase 17 items, whose ids carried servings: `shop:<recipe>:<servings>:<line>`. */
function isItemFor(item: ShoppingItem, recipeId: string, lineId: string): boolean {
  if (item.origin !== "recipe" || item.recipeId !== recipeId) return false;
  if (item.lineId) return item.lineId === lineId;
  return item.id === recipeItemId(recipeId, lineId) || item.id.endsWith(`:${lineId}`);
}

/**
 * A ticked item stays ticked only if what was bought still covers the
 * new need: same unit (or a validated conversion) and no larger amount.
 */
function keepChecked(prev: ShoppingItem, need: RecipeNeed): boolean {
  if (!prev.checked) return false;
  if (need.needsClarification || need.qty === null) return prev.qty === null;
  if (prev.qty === null) return false;
  const prevInNeedUnit = convertUnitQuantity(prev.qty, prev.unit, need.unit);
  return prevInNeedUnit !== null && need.qty <= prevInNeedUnit;
}

/**
 * Put one recipe's current needs on the list. One item per recipe
 * line: generating again updates that item instead of adding a copy
 * or summing onto it, so the list always reflects the latest check.
 *
 * - Lines in `resolvedLineIds` (now covered, swapped, or skipped)
 *   lose their *unticked* item; ticked ones stay as purchase history.
 * - The cook's `notes` and the original `createdAt` survive updates.
 * - Other recipes' items and personal items are never touched.
 */
export function mergeRecipeNeeds(
  existing: ShoppingItem[],
  args: {
    recipeId: string;
    recipeSlug: string;
    recipeTitle?: string;
    servings: number;
    needs: RecipeNeed[];
    resolvedLineIds: string[];
    now: number;
  },
): MergeResult {
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let removed = 0;

  const resolved = new Set(args.resolvedLineIds);
  let next: ShoppingItem[] = [];

  for (const item of existing) {
    const line = args.needs.find((n) => isItemFor(item, args.recipeId, n.lineId));
    if (line) continue; // rebuilt below
    const resolvedLine = [...resolved].find((id) => isItemFor(item, args.recipeId, id));
    if (resolvedLine && !item.checked) {
      removed += 1;
      continue;
    }
    next.push(item);
  }

  for (const need of args.needs) {
    const matches = existing.filter((i) => isItemFor(i, args.recipeId, need.lineId));
    const prev = matches.sort((a, b) => a.createdAt - b.createdAt)[0];
    let item = shoppingItemSchema.parse({
      id: recipeItemId(args.recipeId, need.lineId),
      origin: "recipe",
      recipeId: args.recipeId,
      recipeSlug: args.recipeSlug,
      recipeTitle: args.recipeTitle,
      ingredientId: need.ingredientId,
      lineId: need.lineId,
      name: need.name,
      unit: need.unit,
      qty: need.qty === null ? null : dedust(need.qty),
      requiredQty: need.requiredQty,
      availableQty: need.availableQty,
      servingsContext: args.servings,
      needsClarification: need.needsClarification,
      clarification: need.needsClarification ? need.clarification : undefined,
      notes: prev?.notes,
      category: prev?.category ?? need.category,
      userEdited: prev?.userEdited,
      checked: prev ? keepChecked(prev, need) : false,
      createdAt: prev?.createdAt ?? args.now,
      updatedAt: args.now,
    });
    if (prev?.userEdited) {
      // The cook's own name/amount win; only the recipe context refreshes.
      item = { ...item, name: prev.name, qty: prev.qty, unit: prev.unit, checked: prev.checked };
    }
    if (!prev) {
      added += 1;
    } else if (sameNeed(prev, item) && matches.length === 1) {
      unchanged += 1;
      next.push({ ...prev });
      continue;
    } else {
      updated += 1;
    }
    next.push(item);
  }

  next = shoppingListSchema.shape.items.parse(next);
  return { items: next, added, updated, unchanged, removed };
}

function sameNeed(a: ShoppingItem, b: ShoppingItem): boolean {
  return (
    a.id === b.id &&
    a.qty === b.qty &&
    a.unit === b.unit &&
    a.servingsContext === b.servingsContext &&
    (a.requiredQty ?? null) === (b.requiredQty ?? null) &&
    (a.availableQty ?? null) === (b.availableQty ?? null) &&
    a.needsClarification === b.needsClarification &&
    a.checked === b.checked &&
    a.name === b.name
  );
}

/* ------------------------------------------------------------------ */
/* Combining across recipes (display only)                            */
/* ------------------------------------------------------------------ */

export interface ItemGroup {
  key: string;
  name: string;
  items: ShoppingItem[];
  /** Sum in `totalUnit`, only when every item converts safely. */
  total: number | null;
  totalUnit: string | null;
  /** True when items are in units Kooking can't add together. */
  incompatible: boolean;
}

/**
 * Group unticked items for the same ingredient across recipes.
 * Quantities are summed only when every unit converts through a
 * validated rule; otherwise the parts are shown side by side.
 * Items themselves are never merged, so provenance is kept.
 */
export function groupByIngredient(items: ShoppingItem[]): ItemGroup[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = item.ingredientId ?? `name:${item.name.trim().toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const open = list.filter((i) => !i.checked);
    const unit = open[0]?.unit ?? null;
    let total: number | null = 0;
    for (const i of open) {
      const converted =
        i.qty === null || i.needsClarification ? null : convertUnitQuantity(i.qty, i.unit, unit);
      if (converted === null) {
        total = null;
        break;
      }
      total += converted;
    }
    const incompatible =
      open.length > 1 &&
      open.some((i) => i.qty !== null && convertUnitQuantity(1, i.unit, unit) === null);
    return {
      key,
      name: list[0].name,
      items: list,
      total: open.length > 0 && total !== null ? dedust(total) : null,
      totalUnit: total !== null ? unit : null,
      incompatible,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Personal list operations (Phase 21)                                */
/* ------------------------------------------------------------------ */

export interface ItemDraft {
  name: string;
  qtyText: string;
  unit: string;
  note: string;
  category: ShoppingCategory | "";
}

export type DraftErrors = Partial<Record<"name" | "qty" | "unit" | "note", string>>;

export interface ValidDraft {
  name: string;
  qty: number | null;
  unit: string | null;
  notes?: string;
  category?: ShoppingCategory;
}

/**
 * Validate a typed item. Quantity and unit are optional ("bread"), but
 * a quantity must be a positive number and a unit needs a quantity.
 */
export function validateDraft(
  draft: ItemDraft,
): { ok: true; value: ValidDraft } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {};
  const name = draft.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Enter an item name.";
  else if (name.length > 120) errors.name = "Keep the name under 120 characters.";

  const q = parseQuantityText(draft.qtyText);
  let qty: number | null = null;
  if (q.kind === "invalid") errors.qty = q.message;
  else if (q.kind === "ok") {
    if (q.value <= 0) errors.qty = "Quantity must be more than 0.";
    else qty = q.value;
  }

  const unit = draft.unit.trim() || null;
  if (unit && !(UNITS as readonly string[]).includes(unit))
    errors.unit = "Choose a unit from the list.";
  if (unit && q.kind === "empty") errors.qty = "Add a quantity for this unit, or clear the unit.";

  const note = draft.note.trim();
  if (note.length > 300) errors.note = "Keep the note under 300 characters.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      qty,
      unit: qty === null ? null : unit,
      notes: note || undefined,
      category: draft.category || undefined,
    },
  };
}

export function draftFromItem(item: ShoppingItem): ItemDraft {
  return {
    name: item.name,
    qtyText: item.qty === null || item.needsClarification ? "" : String(item.qty),
    unit: item.unit ?? "",
    note: item.notes ?? "",
    category: item.category ?? "",
  };
}

export function emptyList(ownerId: string, now: number): ShoppingList {
  return { id: `list_${ownerId}`, ownerId, items: [], updatedAt: now };
}

const normalName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");

export type AddOutcome = "added" | "merged" | "already-listed";

/**
 * Add a typed item. An open personal item with the same name is reused:
 * quantities add up when the units convert safely; incompatible units
 * stay as separate lines; a quantity-less repeat changes nothing.
 * Recipe items are never merged into, so their provenance stays exact.
 */
export function addPersonalItem(
  list: ShoppingList,
  value: ValidDraft,
  args: { id: string; now: number },
): { list: ShoppingList; outcome: AddOutcome; itemId: string } {
  const twin = list.items.find(
    (i) =>
      i.origin === "personal" &&
      !i.checked &&
      normalName(i.name) === normalName(value.name) &&
      ((i.qty === null && value.qty === null) ||
        (i.qty !== null &&
          value.qty !== null &&
          convertUnitQuantity(value.qty, value.unit, i.unit) !== null)),
  );

  if (twin) {
    if (twin.qty === null || value.qty === null) {
      return { list, outcome: "already-listed", itemId: twin.id };
    }
    const extra = convertUnitQuantity(value.qty, value.unit, twin.unit)!;
    const merged: ShoppingItem = {
      ...twin,
      qty: dedust(twin.qty + extra),
      notes: twin.notes ?? value.notes,
      category: twin.category ?? value.category,
      updatedAt: args.now,
    };
    return {
      list: replaceItem(list, merged, args.now),
      outcome: "merged",
      itemId: twin.id,
    };
  }

  const item = shoppingItemSchema.parse({
    id: args.id,
    origin: "personal",
    name: value.name,
    qty: value.qty,
    unit: value.unit,
    notes: value.notes,
    category: value.category,
    checked: false,
    createdAt: args.now,
    updatedAt: args.now,
  });
  return {
    list: {
      ...list,
      items: shoppingListSchema.shape.items.parse([...list.items, item]),
      updatedAt: args.now,
    },
    outcome: "added",
    itemId: item.id,
  };
}

function replaceItem(list: ShoppingList, item: ShoppingItem, now: number): ShoppingList {
  return {
    ...list,
    updatedAt: now,
    items: list.items.map((i) => (i.id === item.id ? shoppingItemSchema.parse(item) : i)),
  };
}

/**
 * Edit name, amount, unit, note or aisle. On a recipe item an edited
 * name/amount/unit is marked `userEdited` so the next "Shop for
 * missing ingredients" doesn't overwrite it; the recipe link is kept.
 */
export function updateItem(
  list: ShoppingList,
  itemId: string,
  value: ValidDraft,
  now: number,
): ShoppingList {
  const item = list.items.find((i) => i.id === itemId);
  if (!item) return list;
  const amountChanged =
    item.name !== value.name || item.qty !== value.qty || item.unit !== value.unit;
  const next: ShoppingItem = {
    ...item,
    name: value.name,
    qty: value.qty,
    unit: value.unit,
    notes: value.notes,
    category: value.category,
    updatedAt: now,
  };
  if (amountChanged && item.origin === "recipe") {
    next.userEdited = true;
    // A cook-entered amount answers the clarification.
    if (item.needsClarification && value.qty !== null) {
      next.needsClarification = false;
      next.clarification = undefined;
    }
  }
  return replaceItem(list, next, now);
}

export function setItemChecked(
  list: ShoppingList,
  itemId: string,
  checked: boolean,
  now: number,
): ShoppingList {
  return {
    ...list,
    updatedAt: now,
    items: list.items.map((i) => (i.id === itemId ? { ...i, checked, updatedAt: now } : i)),
  };
}

export function removeItem(list: ShoppingList, itemId: string, now: number): ShoppingList {
  return { ...list, updatedAt: now, items: list.items.filter((i) => i.id !== itemId) };
}

export function clearCompleted(list: ShoppingList, now: number): ShoppingList {
  return { ...list, updatedAt: now, items: list.items.filter((i) => !i.checked) };
}

export interface AisleGroup {
  category: ShoppingCategory | "uncategorised";
  label: string;
  items: ShoppingItem[];
}

/**
 * Active items by aisle, in a fixed order. Uncategorised items come
 * last under their own heading; nothing is guessed into an aisle.
 * With no categorised items at all, a single unlabelled group is used.
 */
export function groupByAisle(items: ShoppingItem[]): AisleGroup[] {
  const order: Array<ShoppingCategory | "uncategorised"> = [
    ...SHOPPING_CATEGORIES,
    "uncategorised",
  ];
  const byKey = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = item.category ?? "uncategorised";
    byKey.set(key, [...(byKey.get(key) ?? []), item]);
  }
  if (!items.some((i) => i.category)) {
    return items.length ? [{ category: "uncategorised", label: "", items }] : [];
  }
  return order
    .filter((k) => byKey.has(k))
    .map((k) => ({
      category: k,
      label: k === "uncategorised" ? "Not sorted" : CATEGORY_LABEL[k],
      items: byKey.get(k)!,
    }));
}
