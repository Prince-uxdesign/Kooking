import { z } from "zod";
import {
  recipeItemId,
  shoppingItemSchema,
  shoppingListSchema,
  type ShoppingItem,
  type ShoppingList,
} from "./shopping";

/**
 * Synchronization and persistence strategies for personal shopping lists (Phase 35).
 * - Stable IDs: recipe items use `recipeItemId(recipeId, lineId)`.
 * - Personal items use `item_${id}`.
 * - Conflict resolution: Item-level Last-Write-Wins based on timestamps.
 * - Deduplication: Recipe line shortages never duplicate if re-added or generated multiple times.
 * - Tombstones: Deletion timestamps ensure deleted items aren't resurrected by stale devices.
 */

export const shoppingSyncStatusSchema = z.enum(["guest", "synced", "syncing", "offline", "error"]);

export type ShoppingSyncStatus = z.infer<typeof shoppingSyncStatusSchema>;

export interface MergeShoppingResult {
  mergedList: ShoppingList;
  /** Number of items added or updated from remote */
  remoteChangesCount: number;
  /** Number of items that local has newer than remote (needing upload) */
  localChangesCount: number;
}

/**
 * Resolves item timestamp, falling back to createdAt if updatedAt is unset.
 */
function itemTimestamp(item: ShoppingItem): number {
  return item.updatedAt ?? item.createdAt;
}

/**
 * Normalizes item key for deduplication.
 * Recipe items are keyed by their stable `shop:${recipeId}:${lineId}`.
 * Personal items are keyed by `item.id`.
 */
export function itemKey(item: ShoppingItem): string {
  if (item.origin === "recipe" && item.recipeId && item.lineId) {
    return recipeItemId(item.recipeId, item.lineId);
  }
  return item.id;
}

/**
 * Merges a local shopping list with a remote shopping list.
 *
 * Conflict Resolution Rules:
 * 1. Both lists are scanned. Recipe shortages with identical recipe + line are unified.
 * 2. If an item appears in both lists, the one with the higher timestamp wins.
 * 3. If an item was deleted at `tombstones[id]`, it is ignored unless the counterpart
 *    was edited AFTER the deletion time.
 * 4. Preserves manual items alongside recipe-generated items.
 * 5. Returns a clean ShoppingList and counts of remote/local differences.
 */
export function mergeShoppingLists(
  local: ShoppingList,
  remote: ShoppingList,
  options: {
    tombstones?: Record<string, number>;
    now?: number;
    ownerId?: string;
  } = {},
): MergeShoppingResult {
  const now = options.now ?? Date.now();
  const ownerId = options.ownerId ?? local.ownerId;
  const tombstones = options.tombstones ?? {};

  const localByKey = new Map<string, ShoppingItem>();
  for (const item of local.items) {
    localByKey.set(itemKey(item), item);
  }

  const remoteByKey = new Map<string, ShoppingItem>();
  for (const item of remote.items) {
    remoteByKey.set(itemKey(item), item);
  }

  const allKeys = new Set([...localByKey.keys(), ...remoteByKey.keys()]);
  const mergedItems: ShoppingItem[] = [];
  let remoteChangesCount = 0;
  let localChangesCount = 0;

  for (const key of allKeys) {
    const localItem = localByKey.get(key);
    const remoteItem = remoteByKey.get(key);
    const deletedAt = tombstones[key] ?? 0;

    if (localItem && !remoteItem) {
      // Item only exists locally
      if (itemTimestamp(localItem) > deletedAt) {
        mergedItems.push(localItem);
        localChangesCount++;
      }
    } else if (!localItem && remoteItem) {
      // Item only exists remotely
      if (itemTimestamp(remoteItem) > deletedAt) {
        mergedItems.push(remoteItem);
        remoteChangesCount++;
      }
    } else if (localItem && remoteItem) {
      // Item exists in both: Last-Write-Wins
      const localTime = itemTimestamp(localItem);
      const remoteTime = itemTimestamp(remoteItem);

      if (Math.max(localTime, remoteTime) <= deletedAt) {
        // Was deleted on this device after both timestamps
        continue;
      }

      if (remoteTime > localTime) {
        mergedItems.push(remoteItem);
        remoteChangesCount++;
      } else if (localTime > remoteTime) {
        mergedItems.push(localItem);
        localChangesCount++;
      } else {
        // Timestamps match: adopt local item
        mergedItems.push(localItem);
      }
    }
  }

  // Sort items: open items first (by creation), then completed items
  mergedItems.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  const mergedList: ShoppingList = shoppingListSchema.parse({
    id: local.id || `list_${ownerId}`,
    ownerId,
    items: mergedItems,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt, now),
  });

  return {
    mergedList,
    remoteChangesCount,
    localChangesCount,
  };
}

/**
 * Maps a domain ShoppingItem to a database record for Supabase `shopping_items`.
 */
export function shoppingItemToDbRow(item: ShoppingItem, userId: string) {
  return {
    user_id: userId,
    id: item.id,
    origin: item.origin,
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    checked: item.checked,
    recipe_id: item.recipeId ?? null,
    recipe_slug: item.recipeSlug ?? null,
    recipe_title: item.recipeTitle ?? null,
    line_id: item.lineId ?? null,
    category: item.category ?? null,
    notes: item.notes ?? null,
    servings_context: item.servingsContext ?? null,
    needs_clarification: item.needsClarification ?? false,
    clarification: item.clarification ?? null,
    user_edited: item.userEdited ?? false,
    created_at_ms: item.createdAt,
    updated_at_ms: item.updatedAt ?? item.createdAt,
  };
}

/**
 * Maps a database row from Supabase `shopping_items` back to a domain ShoppingItem.
 */
export function dbRowToShoppingItem(row: Record<string, unknown>): ShoppingItem {
  return shoppingItemSchema.parse({
    id: String(row.id),
    origin: row.origin === "recipe" ? "recipe" : "personal",
    name: String(row.name),
    qty: row.qty !== null && row.qty !== undefined ? Number(row.qty) : null,
    unit: row.unit ? String(row.unit) : null,
    checked: Boolean(row.checked),
    recipeId: row.recipe_id ? String(row.recipe_id) : undefined,
    recipeSlug: row.recipe_slug ? String(row.recipe_slug) : undefined,
    recipeTitle: row.recipe_title ? String(row.recipe_title) : undefined,
    lineId: row.line_id ? String(row.line_id) : undefined,
    category: row.category ? row.category : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    servingsContext:
      row.servings_context !== null && row.servings_context !== undefined
        ? Number(row.servings_context)
        : undefined,
    needsClarification: Boolean(row.needs_clarification),
    clarification: row.clarification ? String(row.clarification) : undefined,
    userEdited: Boolean(row.user_edited),
    createdAt: Number(row.created_at_ms || Date.now()),
    updatedAt: Number(row.updated_at_ms || row.created_at_ms || Date.now()),
  });
}
