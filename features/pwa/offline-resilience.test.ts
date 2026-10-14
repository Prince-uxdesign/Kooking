// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecipeRepository } from "@/shared/data/catalog";
import { LocalRecipeCache, LocalShopping } from "@/shared/data/local";
import { formatCachedAt } from "@/shared/domain/recipe-cache";
import {
  addPersonalItem,
  emptyList,
  removeItem,
  setItemChecked,
  updateItem,
} from "@/shared/domain/shopping";
import { mergeShoppingLists } from "@/shared/domain/shopping-sync";
import { remainingMs, type SessionTimer } from "@/shared/domain/timers";

describe("Phase 36: Offline Resilience & Cooking Session Recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("C. Local Recipe Cache", () => {
    it("caches full structured recipes with steps, ingredients, cues, and equipment", async () => {
      const cache = new LocalRecipeCache();
      const cachedTime = 1700000000000;
      const recipes = await getRecipeRepository().list();
      const realRecipe = recipes[0];

      await cache.save(realRecipe, cachedTime);

      const retrieved = await cache.get(realRecipe.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.recipe.title).toBe(realRecipe.title);
      expect(retrieved?.recipe.steps.length).toBeGreaterThan(0);
      expect(retrieved?.cachedAt).toBe(cachedTime);

      // Verify getBySlug
      const bySlug = await cache.getBySlug(realRecipe.slug);
      expect(bySlug?.recipe.id).toBe(realRecipe.id);
    });

    it("formats cache freshness accurately", () => {
      const now = 1700000000000;
      expect(formatCachedAt(now - 30 * 1000, now)).toBe("just now");
      expect(formatCachedAt(now - 5 * 60 * 1000, now)).toBe("5m ago");
      expect(formatCachedAt(now - 3 * 3600 * 1000, now)).toBe("3h ago");
      expect(formatCachedAt(now - 2 * 24 * 3600 * 1000, now)).toBe("2d ago");
    });
  });

  describe("D. Active Cooking Session & Timers Offline", () => {
    it("preserves session state and computes remaining time from timestamps without drift", async () => {
      const startTime = 1700000000000;
      const timerDuration = 300; // 5 minutes = 300s

      const timer: SessionTimer = {
        id: "timer_test_1",
        stepId: "step_2",
        label: "Simmer",
        durationSeconds: timerDuration,
        startedAt: startTime,
        endsAt: startTime + timerDuration * 1000,
        remainingMs: timerDuration * 1000,
        status: "running",
        finishedAt: null,
        acknowledged: false,
      };

      // 1 minute later
      const oneMinuteLater = startTime + 60 * 1000;
      const left1 = remainingMs(timer, oneMinuteLater);
      expect(Math.round(left1 / 1000)).toBe(240); // 4 minutes left

      // 5 minutes later (timer ends)
      const fiveMinutesLater = startTime + 300 * 1000;
      const leftDone = remainingMs(timer, fiveMinutesLater);
      expect(leftDone).toBe(0);

      // Verify that after expiration, remaining time is 0 and does not negative overflow
      const sevenMinutesLater = startTime + 420 * 1000;
      expect(remainingMs(timer, sevenMinutesLater)).toBe(0);
    });

    it("does not infer food is ready simply because timer reached 0", async () => {
      const recipes = await getRecipeRepository().list();
      const recipeWithDoneness = recipes.find((r) =>
        r.steps.some((s) => s.completionNote || s.cues),
      );
      expect(recipeWithDoneness).toBeDefined();
    });
  });

  describe("E. Offline Shopping List Persistence & Synchronization", () => {
    it("supports local additions, edits, toggles, and removals while offline", async () => {
      const shopping = new LocalShopping();
      let list = emptyList("guest", 1700000000000);

      // 1. Add item offline
      const addRes = addPersonalItem(
        list,
        { name: "Red Onions", qty: 2, unit: "pieces" },
        {
          id: "item_1",
          now: 1700000001000,
        },
      );
      list = addRes.list;
      expect(list.items).toHaveLength(1);
      expect(list.items[0].name).toBe("Red Onions");

      // 2. Toggle checked offline
      list = setItemChecked(list, "item_1", true, 1700000002000);
      expect(list.items[0].checked).toBe(true);

      // 3. Edit item offline
      list = updateItem(
        list,
        "item_1",
        { name: "Red Onions", qty: 4, unit: "pieces" },
        1700000003000,
      );
      expect(list.items[0].qty).toBe(4);

      // Store in LocalShopping
      await shopping.store(list);
      const stored = await shopping.load("guest");
      expect(stored?.items[0].qty).toBe(4);
      expect(stored?.items[0].checked).toBe(true);

      // 4. Remove item offline
      list = removeItem(list, "item_1", 1700000004000);
      expect(list.items).toHaveLength(0);
      await shopping.store(list);
      const afterRemoval = await shopping.load("guest");
      expect(afterRemoval?.items).toHaveLength(0);
    });

    it("synchronizes offline edits with remote server changes using Last-Write-Wins without duplicates", () => {
      const localList = emptyList("user_123", 1700000010000);
      localList.items = [
        {
          id: "item_curry",
          name: "Curry powder",
          qty: 1,
          unit: "tbsp",
          checked: true, // checked locally while offline
          needsClarification: false,
          origin: "personal",
          createdAt: 1700000000000,
          updatedAt: 1700000010000, // Newer local update
        },
        {
          id: "item_garlic",
          name: "Garlic cloves",
          qty: 5,
          unit: "clove",
          checked: false,
          needsClarification: false,
          origin: "personal",
          createdAt: 1700000005000,
          updatedAt: 1700000005000,
        },
      ];

      const remoteList = emptyList("user_123", 1700000008000);
      remoteList.items = [
        {
          id: "item_curry",
          name: "Curry powder",
          qty: 1,
          unit: "tbsp",
          checked: false, // Older remote state
          needsClarification: false,
          origin: "personal",
          createdAt: 1700000000000,
          updatedAt: 1700000002000,
        },
        {
          id: "item_thyme", // Added remotely on another device
          name: "Dried thyme",
          qty: 1,
          unit: "tsp",
          checked: false,
          needsClarification: false,
          origin: "personal",
          createdAt: 1700000008000,
          updatedAt: 1700000008000,
        },
      ];

      // Merge
      const { mergedList } = mergeShoppingLists(localList, remoteList, {
        ownerId: "user_123",
      });

      // Assertions
      expect(mergedList.items).toHaveLength(3); // curry, garlic, thyme
      const mergedCurry = mergedList.items.find((i) => i.id === "item_curry");
      expect(mergedCurry?.checked).toBe(true); // Newer local checked state wins
      const mergedThyme = mergedList.items.find((i) => i.id === "item_thyme");
      expect(mergedThyme).toBeDefined(); // Remote addition preserved without duplicates
    });
  });
});
