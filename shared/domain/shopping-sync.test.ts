import { describe, expect, it } from "vitest";
import {
  dbRowToShoppingItem,
  itemKey,
  mergeShoppingLists,
  shoppingItemToDbRow,
} from "./shopping-sync";
import type { ShoppingItem, ShoppingList } from "./shopping";

describe("shopping-sync domain", () => {
  const itemRecipe1: ShoppingItem = {
    id: "shop:jollof:onions",
    origin: "recipe",
    recipeId: "jollof",
    recipeSlug: "jollof",
    lineId: "onions",
    name: "Red Onions",
    qty: 2,
    unit: "piece",
    checked: false,
    needsClarification: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  const itemPersonal1: ShoppingItem = {
    id: "item_p1",
    origin: "personal",
    name: "Paper Towels",
    qty: 1,
    unit: null,
    checked: false,
    needsClarification: false,
    createdAt: 1000,
    updatedAt: 1000,
  };

  it("itemKey derives deterministic key for recipe items and unique id for personal", () => {
    expect(itemKey(itemRecipe1)).toBe("shop:jollof:onions");
    expect(itemKey(itemPersonal1)).toBe("item_p1");
  });

  describe("mergeShoppingLists", () => {
    it("combines items from both local and remote without losing manual items", () => {
      const local: ShoppingList = {
        id: "list_guest",
        ownerId: "guest",
        items: [itemRecipe1],
        updatedAt: 1000,
      };

      const remote: ShoppingList = {
        id: "list_u1",
        ownerId: "u1",
        items: [itemPersonal1],
        updatedAt: 1000,
      };

      const { mergedList, localChangesCount, remoteChangesCount } = mergeShoppingLists(
        local,
        remote,
        { ownerId: "u1" },
      );

      expect(mergedList.items).toHaveLength(2);
      expect(mergedList.items.map((i) => i.id)).toContain("shop:jollof:onions");
      expect(mergedList.items.map((i) => i.id)).toContain("item_p1");
      expect(localChangesCount).toBe(1);
      expect(remoteChangesCount).toBe(1);
    });

    it("resolves conflicts using Last-Write-Wins on timestamps", () => {
      const olderLocal: ShoppingItem = {
        ...itemRecipe1,
        qty: 2,
        checked: false,
        updatedAt: 1000,
      };

      const newerRemote: ShoppingItem = {
        ...itemRecipe1,
        qty: 3,
        checked: true, // checked on another device later
        updatedAt: 2000,
      };

      const local: ShoppingList = {
        id: "list_1",
        ownerId: "u1",
        items: [olderLocal],
        updatedAt: 1000,
      };

      const remote: ShoppingList = {
        id: "list_1",
        ownerId: "u1",
        items: [newerRemote],
        updatedAt: 2000,
      };

      const { mergedList } = mergeShoppingLists(local, remote);
      expect(mergedList.items).toHaveLength(1);
      expect(mergedList.items[0].qty).toBe(3);
      expect(mergedList.items[0].checked).toBe(true);
    });

    it("prevents accidental duplicates when a recipe is checked and added multiple times", () => {
      const lineShortage1: ShoppingItem = {
        id: "shop:jollof:rice",
        origin: "recipe",
        recipeId: "jollof",
        lineId: "rice",
        name: "Long grain rice",
        qty: 500,
        unit: "g",
        checked: false,
        needsClarification: false,
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Same recipe and line, generated again on another device with updated servings
      const lineShortage2: ShoppingItem = {
        id: "shop:jollof:rice",
        origin: "recipe",
        recipeId: "jollof",
        lineId: "rice",
        name: "Long grain rice",
        qty: 1000,
        unit: "g",
        checked: false,
        needsClarification: false,
        createdAt: 1000,
        updatedAt: 3000,
      };

      const local: ShoppingList = {
        id: "list_1",
        ownerId: "u1",
        items: [lineShortage1],
        updatedAt: 1000,
      };

      const remote: ShoppingList = {
        id: "list_1",
        ownerId: "u1",
        items: [lineShortage2],
        updatedAt: 3000,
      };

      const { mergedList } = mergeShoppingLists(local, remote);
      expect(mergedList.items).toHaveLength(1);
      expect(mergedList.items[0].qty).toBe(1000);
    });

    it("respects tombstones and avoids resurrecting items deleted earlier", () => {
      const local: ShoppingList = {
        id: "list_1",
        ownerId: "u1",
        items: [],
        updatedAt: 3000,
      };

      const remote: ShoppingList = {
        id: "list_1",
        ownerId: "u1",
        items: [itemPersonal1], // updatedAt = 1000
        updatedAt: 1000,
      };

      // itemPersonal1 was deleted locally at 2500
      const { mergedList } = mergeShoppingLists(local, remote, {
        tombstones: { [itemPersonal1.id]: 2500 },
      });

      expect(mergedList.items).toHaveLength(0);
    });
  });

  describe("database row conversions", () => {
    it("converts domain item to db row and back cleanly", () => {
      const row = shoppingItemToDbRow(itemRecipe1, "user_123");
      expect(row.user_id).toBe("user_123");
      expect(row.id).toBe(itemRecipe1.id);
      expect(row.name).toBe("Red Onions");
      expect(row.qty).toBe(2);

      const parsedBack = dbRowToShoppingItem(row);
      expect(parsedBack.id).toBe(itemRecipe1.id);
      expect(parsedBack.name).toBe(itemRecipe1.name);
      expect(parsedBack.qty).toBe(itemRecipe1.qty);
      expect(parsedBack.checked).toBe(itemRecipe1.checked);
      expect(parsedBack.origin).toBe("recipe");
    });
  });
});
