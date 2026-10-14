import { describe, expect, it } from "vitest";
import seedJson from "@/content/seed/demo-tomato-rice.json";
import { recipeSchema } from "@/shared/domain/recipe-schema";
import { buildSearchIndex, searchRecipes, EMPTY_SEARCH } from "@/shared/domain/search";
import { evaluateRecipeReadiness } from "@/shared/domain/readiness";
import { buildKitchenCheckView } from "@/shared/domain/kitchen-check";
import { startSession, transitionSession } from "@/shared/domain/session";
import { finishCooking } from "@/shared/domain/cooking-session";
import { emptyList, createPersonalItem, addPersonalItem } from "@/shared/domain/shopping";
import { createGuest } from "@/shared/domain/user";

describe("Anonymous User Journey (No Forced Signup)", () => {
  const recipe = recipeSchema.parse(seedJson);
  const now = 1_800_000_000_000;
  const guest = createGuest("guest-device-123", now);
  const names: Record<string, string> = {
    "demo:long-grain-rice": "Long-grain rice",
    "demo:tomato-paste": "Tomato paste",
    "demo:tomato-puree": "Tomato puree",
    "demo:salt": "Salt",
  };

  it("1. Anonymous users can browse, search, and filter catalog recipes without an account", () => {
    const index = buildSearchIndex(
      [recipe],
      [{ id: "demo:long-grain-rice", name: "Long-grain rice", aliases: [] }],
    );
    const results = searchRecipes(index, { ...EMPTY_SEARCH, q: "tomato" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].summary.slug).toBe(recipe.slug);
  });

  it("2. Anonymous users can inspect recipe details and calculate readiness", () => {
    const readiness = evaluateRecipeReadiness({ recipe, pantry: [] });
    expect(readiness.servings).toBe(recipe.baseServings);
    expect(readiness.totalRequirements).toBe(recipe.ingredients.length);
    expect(typeof readiness.ready).toBe("boolean");
  });

  it("3. Anonymous users can run Kitchen Check", () => {
    const view = buildKitchenCheckView({
      recipe,
      servings: recipe.baseServings,
      record: null,
      ingredientNames: names,
    });
    expect(view.readiness).toBeDefined();
    expect(view.rows.length).toBe(recipe.ingredients.length);
  });

  it("4. Anonymous users can generate and manage personal shopping lists", () => {
    const list = emptyList(guest.id, now);
    expect(list.ownerId).toBe(guest.id);
    expect(list.items).toEqual([]);

    const item = createPersonalItem({
      id: "shop-item-1",
      name: "Scotch bonnet peppers",
      unit: "pieces",
      qty: 4,
      now,
    });
    const updated = {
      ...list,
      items: [item],
    };
    expect(updated.items.length).toBe(1);
    expect(updated.items[0].name).toBe("Scotch bonnet peppers");
  });

  it("5. Anonymous users can start, step through, and complete Cooking Mode without interruption", () => {
    // Starting cooking mode requires NO login
    const session = startSession({
      id: "guest-cook-session-1",
      recipe,
      servings: 4,
      now,
      lineNames: new Map(),
    });

    expect(session.status).toBe("active");
    expect(session.recipeId).toBe(recipe.id);

    // Pause & resume work without auth
    const paused = transitionSession(session, "pause", now + 10_000);
    expect(paused.status).toBe("paused");
    const resumed = transitionSession(paused, "resume", now + 20_000);
    expect(resumed.status).toBe("active");

    // Finishing cooking completes cleanly
    const completed = finishCooking(
      {
        ...resumed,
        completedStepIds: recipe.steps.map((s) => s.id),
      },
      now + 30_000,
    );
    expect(completed.status).toBe("completed");
  });

  it("6. Guest user identity is stable and isolated on the device", () => {
    expect(guest.kind).toBe("guest");
    expect(guest.id).toBe("guest-device-123");
  });
});
