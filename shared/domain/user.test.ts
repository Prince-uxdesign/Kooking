import { describe, expect, it } from "vitest";
import { StoreError } from "@/shared/data/repositories";
import { MemoryRecipes, MemorySaved, MemorySessions, MemoryShopping } from "@/shared/data/memory";
import { recipeSchema } from "./recipe-schema";
import { createGuest, toggleSavedId } from "./user";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const recipe = recipeSchema.parse(seedJson);

describe("guest users and saves", () => {
  it("creates guest identities without credentials", () => {
    expect(createGuest("device-1", 1000)).toMatchObject({ id: "device-1", kind: "guest" });
  });

  it("toggles saved ids idempotently", () => {
    expect(toggleSavedId([], "r1")).toEqual(["r1"]);
    expect(toggleSavedId(["r1"], "r1")).toEqual([]);
    expect(toggleSavedId(["r1"], "r2")).toEqual(["r1", "r2"]);
  });

  it("persists saves per owner in memory", async () => {
    const saved = new MemorySaved();
    await saved.save({ ownerId: "device-1", recipeId: recipe.id, savedAt: 1000 });
    expect(await saved.listIds("device-1")).toEqual([recipe.id]);
    await saved.unsave("device-1", recipe.id);
    expect(await saved.listIds("device-1")).toEqual([]);
  });
});

describe("memory repositories", () => {
  it("resolves recipes by id and slug, or throws not-found", async () => {
    const repos = new MemoryRecipes([recipe]);
    expect(await repos.getBySlug("demo-tomato-rice")).toMatchObject({ id: "demo-tomato-rice" });
    await expect(repos.getById("nope")).rejects.toThrow(/not found/);
  });

  it("stores shopping lists and sessions per owner", async () => {
    const shopping = new MemoryShopping();
    expect(await shopping.load("device-1")).toBeNull();
    await shopping.store({ id: "l1", ownerId: "device-1", items: [], updatedAt: 5 });
    expect(await shopping.load("device-1")).toMatchObject({ id: "l1" });

    const sessions = new MemorySessions();
    expect(await sessions.latestForRecipe(recipe.id)).toBeNull();
    const session = {
      id: "s1",
      recipeId: recipe.id,
      recipeSlug: recipe.slug,
      contentVersion: 1,
      servings: 4,
      currentStepIndex: 0,
      completedStepIds: [],
      timers: [],
      snapshot: [],
      status: "active" as const,
      createdAt: 5,
      updatedAt: 5,
    };
    await sessions.store(session);
    expect(await sessions.latestForRecipe(recipe.id)).toMatchObject({ id: "s1" });
    await expect(sessions.getById("nope")).rejects.toBeInstanceOf(StoreError);
  });
});
