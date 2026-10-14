// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearAccountLocalData, COOKING_HISTORY_KEY, LocalCookingHistory } from "./local";
import { MemorySyncAdapter } from "./remote-sync";
import type { CookingHistoryEntry } from "@/shared/domain/cooking-history";
import type { ShoppingList } from "@/shared/domain/shopping";

describe("remote-sync & account isolation", () => {
  let adapter: MemorySyncAdapter;

  beforeEach(() => {
    adapter = new MemorySyncAdapter();
    window.localStorage.clear();
  });

  describe("MemorySyncAdapter cross-device shopping sync", () => {
    it("simulates cross-device shopping list convergence without duplicates", async () => {
      const userId = "user_456";

      // Device A adds an item
      const listDeviceA: ShoppingList = {
        id: `list_${userId}`,
        ownerId: userId,
        items: [
          {
            id: "shop:jollof:rice",
            origin: "recipe",
            recipeId: "jollof",
            lineId: "rice",
            name: "Rice",
            qty: 500,
            unit: "g",
            checked: false,
            needsClarification: false,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
        updatedAt: 1000,
      };

      const syncA = await adapter.syncShoppingList(userId, listDeviceA);
      expect(syncA.list.items).toHaveLength(1);

      // Device B adds a personal item
      const listDeviceB: ShoppingList = {
        id: `list_${userId}`,
        ownerId: userId,
        items: [
          {
            id: "item_salt",
            origin: "personal",
            name: "Sea Salt",
            qty: 1,
            unit: null,
            checked: false,
            needsClarification: false,
            createdAt: 1500,
            updatedAt: 1500,
          },
        ],
        updatedAt: 1500,
      };

      // When Device B syncs, it receives Device A's rice and keeps its salt
      const syncB = await adapter.syncShoppingList(userId, listDeviceB);
      expect(syncB.list.items).toHaveLength(2);

      // When Device A syncs again, it receives Device B's salt
      const syncA2 = await adapter.syncShoppingList(userId, syncA.list);
      expect(syncA2.list.items).toHaveLength(2);
      expect(syncA2.list.items.map((i) => i.id)).toEqual(
        expect.arrayContaining(["shop:jollof:rice", "item_salt"]),
      );
    });

    it("records and fetches cooking history in order", async () => {
      const userId = "user_789";

      const entry1: CookingHistoryEntry = {
        id: "h1",
        sessionId: "sess_1",
        userId,
        recipeId: "suya",
        recipeTitle: "Suya",
        recipeSlug: "suya",
        contentVersion: 1,
        servings: 2,
        status: "completed",
        startedAt: 1000,
        completedAt: 2000,
        durationMinutes: 15,
        completedStepsCount: 3,
        totalStepsCount: 3,
        createdAt: 2000,
      };

      const entry2: CookingHistoryEntry = {
        id: "h2",
        sessionId: "sess_2",
        userId,
        recipeId: "chin-chin",
        recipeTitle: "Chin Chin",
        recipeSlug: "chin-chin",
        contentVersion: 1,
        servings: 4,
        status: "abandoned",
        startedAt: 3000,
        completedAt: 3500,
        durationMinutes: 8,
        completedStepsCount: 1,
        totalStepsCount: 5,
        createdAt: 3500,
      };

      await adapter.recordCookingHistory(userId, entry1);
      await adapter.recordCookingHistory(userId, entry2);

      const res = await adapter.fetchCookingHistory(userId);
      expect(res.entries).toHaveLength(2);
      expect(res.entries[0].recipeTitle).toBe("Chin Chin"); // newest startedAt first
      expect(res.entries[1].recipeTitle).toBe("Suya");
    });

    it("persists user preferences", async () => {
      const userId = "user_prefs_1";
      await adapter.saveUserPreferences(userId, {
        defaultServings: 6,
        screenWake: false,
        soundAlerts: true,
        readAloud: true,
      });

      const res = await adapter.fetchUserPreferences(userId);
      expect(res.preferences?.defaultServings).toBe(6);
      expect(res.preferences?.screenWake).toBe(false);
      expect(res.preferences?.readAloud).toBe(true);
    });
  });

  describe("clearAccountLocalData (Sign-out hygiene)", () => {
    it("clears private cooking history and removes user shopping list without leaking", async () => {
      const localHistory = new LocalCookingHistory();
      await localHistory.record({
        id: "h1",
        sessionId: "sess_private",
        recipeId: "jollof",
        recipeTitle: "Private Jollof",
        recipeSlug: "jollof",
        contentVersion: 1,
        servings: 4,
        status: "completed",
        startedAt: 1000,
        completedAt: 2000,
        durationMinutes: 15,
        completedStepsCount: 4,
        totalStepsCount: 4,
        createdAt: 2000,
      });

      // Populate user shopping list in localStorage
      window.localStorage.setItem(
        "kooking:lists:v1",
        JSON.stringify([
          { id: "list_guest", ownerId: "guest", items: [], updatedAt: 100 },
          { id: "list_u1", ownerId: "u1", items: [{ id: "private_item" }], updatedAt: 200 },
        ]),
      );

      expect(await localHistory.list()).toHaveLength(1);

      // Sign out
      clearAccountLocalData("u1");

      // Verify history is cleared
      expect(await localHistory.list()).toHaveLength(0);

      // Verify user list was removed while guest list was preserved
      const listsRaw = window.localStorage.getItem("kooking:lists:v1");
      const lists = JSON.parse(listsRaw!);
      expect(lists).toHaveLength(1);
      expect(lists[0].ownerId).toBe("guest");
    });
  });
});
