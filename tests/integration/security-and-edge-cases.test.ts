// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import seedJson from "@/content/seed/demo-tomato-rice.json";
import { recipeSchema } from "@/shared/domain/recipe-schema";
import { buildSearchIndex, searchRecipes, EMPTY_SEARCH } from "@/shared/domain/search";
import { LocalSessions, LocalShopping, LocalKitchenChecks } from "@/shared/data/local";
import { createPersonalItem, emptyList } from "@/shared/domain/shopping";
import { planSavedRecipesMerge } from "@/shared/domain/auth";

describe("Phase 39 QA: Security, Data Integrity & Edge Case Boundaries", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("A. Environment & Secrets Safety", () => {
    it("ensures service role keys and secrets are never exposed on client-accessible globals", () => {
      // Any env exposed to browser begins with NEXT_PUBLIC_
      // Verify no critical private keys are in NEXT_PUBLIC_
      const envKeys = Object.keys(process.env);
      const exposedSecrets = envKeys.filter((key) => {
        if (!key.startsWith("NEXT_PUBLIC_")) return false;
        const upper = key.toUpperCase();
        return (
          upper.includes("SERVICE_ROLE") ||
          upper.includes("SECRET") ||
          upper.includes("DATABASE_URL") ||
          upper.includes("PRIVATE")
        );
      });

      expect(exposedSecrets).toEqual([]);
    });
  });

  describe("B. Input Validation & Injection Resistance", () => {
    it("safely handles XSS payloads and SQL injection attempts in search queries without exceptions", () => {
      const recipe = recipeSchema.parse(seedJson);
      const index = buildSearchIndex([recipe], []);

      const maliciousQueries = [
        "'; DROP TABLE recipes; --",
        "<script>alert('xss')</script>",
        "../../../etc/passwd",
        "${7*7}",
        "{{7*7}}",
        "\\x00\\x1f",
        "A".repeat(1000), // Oversized query
      ];

      maliciousQueries.forEach((q) => {
        expect(() => {
          const results = searchRecipes(index, { ...EMPTY_SEARCH, q });
          expect(Array.isArray(results)).toBe(true);
        }).not.toThrow();
      });
    });

    it("enforces boundary validation on servings and recipe mutations", () => {
      const valid = recipeSchema.parse(seedJson);

      // Mutating baseServings to invalid values must be rejected by schema
      expect(() =>
        recipeSchema.parse({
          ...valid,
          baseServings: -1,
        }),
      ).toThrow();

      expect(() =>
        recipeSchema.parse({
          ...valid,
          baseServings: 0,
        }),
      ).toThrow();

      expect(() =>
        recipeSchema.parse({
          ...valid,
          baseServings: 100, // Exceeds realistic serving boundary
        }),
      ).toThrow();
    });

    it("rejects invalid or oversized shopping item inputs", () => {
      expect(() =>
        createPersonalItem({
          id: "item-1",
          name: "", // Empty name rejected
          qty: 2,
          unit: "pieces",
          now: Date.now(),
        }),
      ).toThrow();

      expect(() =>
        createPersonalItem({
          id: "item-1",
          name: "Rice",
          qty: -5, // Negative qty rejected
          unit: "g",
          now: Date.now(),
        }),
      ).toThrow();
    });
  });

  describe("C. Local Storage Corruption Salvage & Fault Tolerance", () => {
    it("gracefully recovers and salvages from malformed or corrupted localStorage sessions", async () => {
      const sessions = new LocalSessions();

      // Write corrupted non-JSON string into the sessions key
      localStorage.setItem("kooking.sessions.v1", "CORRUPTED_NON_JSON_DATA{{{[[[");

      // Reading must not crash with uncaught SyntaxError
      const resumable = await sessions.listResumable();
      expect(Array.isArray(resumable)).toBe(true);
      expect(resumable).toHaveLength(0);

      // Storing a new valid session must succeed and back up the damaged data safely
      const recipe = recipeSchema.parse(seedJson);
      await sessions.store({
        id: "fresh-session-1",
        recipeId: recipe.id,
        recipeSlug: recipe.slug,
        contentVersion: recipe.contentVersion,
        servings: 4,
        baseServings: recipe.baseServings,
        currentStepIndex: 0,
        completedStepIds: [],
        timers: [],
        snapshot: [],
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        recipeTitle: recipe.title,
        demo: recipe.demo,
        steps: recipe.steps,
        pausedAt: null,
        completedAt: null,
        abandonedAt: null,
      });

      const loaded = await sessions.getById("fresh-session-1");
      expect(loaded.id).toBe("fresh-session-1");
    });

    it("gracefully handles corrupted shopping lists in localStorage", async () => {
      const shopping = new LocalShopping();

      localStorage.setItem("kooking.shopping.v1", "INVALID_JSON");

      const loaded = await shopping.load("guest");
      // Returns fallback empty list without throwing
      expect(loaded).toBeNull();
    });

    it("gracefully handles corrupted kitchen checks in localStorage", async () => {
      const checks = new LocalKitchenChecks();

      localStorage.setItem("kooking.kitchen_checks.v1", "{bad json}");

      const loaded = await checks.load("some-recipe-id");
      expect(loaded).toBeNull();
    });
  });

  describe("D. Private Data Isolation & Account Transitions", () => {
    it("preserves guest saved recipes when migrating to account without leaking unrelated data", () => {
      const guestSaved = ["demo:jollof-rice", "demo:egusi-soup"];
      const accountSaved = ["demo:fried-rice"];

      const plan = planSavedRecipesMerge(guestSaved, accountSaved);

      // Result should upload guest recipes and preserve both without duplicates
      expect(plan.toUpload).toEqual(["demo:jollof-rice", "demo:egusi-soup"]);
      expect(plan.duplicateCount).toBe(0);
      expect(plan.mergedIds.sort()).toEqual([
        "demo:egusi-soup",
        "demo:fried-rice",
        "demo:jollof-rice",
      ]);
    });

    it("isolates shopping lists between different owners", async () => {
      const shopping = new LocalShopping();
      const listA = emptyList("user_A", 1000);
      listA.items = [
        {
          id: "item_a",
          name: "Item for A",
          qty: 1,
          unit: "pieces",
          checked: false,
          needsClarification: false,
          origin: "personal",
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      await shopping.store(listA);

      // Querying as user_B must not see user_A's items
      const loadedB = await shopping.load("user_B");
      expect(loadedB).toBeNull();

      const loadedA = await shopping.load("user_A");
      expect(loadedA?.items).toHaveLength(1);
      expect(loadedA?.items[0].name).toBe("Item for A");
    });
  });
});
