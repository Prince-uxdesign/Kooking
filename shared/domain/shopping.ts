import { z } from "zod";
import type { ScaledLine } from "./scaling";

/**
 * One shopping list per device in MVP. Items carry provenance
 * (which recipe + servings produced them) but quantities are
 * snapshots — changing servings later never rewrites history.
 */

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
