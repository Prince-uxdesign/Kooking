import { describe, expect, it } from "vitest";
import collectionsJson from "../../content/collections.json";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { getCollectionRepository } from "@/shared/data/catalog";
import {
  CATEGORIES,
  categoryHref,
  countByCategory,
  getCategory,
  inCategory,
  isRecipeCategory,
  recipeCountLabel,
} from "./categories";
import {
  collectionHref,
  collectionsSchema,
  matchesRule,
  recipesInCollection,
  visibleCollections,
  type Collection,
} from "./collections";
import { toSummary } from "./discovery";
import { recipeCategories, recipeSchema, type Recipe } from "./recipe-schema";

const seed = recipeSchema.parse(seedJson);

function recipe(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return { ...seed, id, slug: id, title: id, ...overrides };
}

function minutes(total: number) {
  return { prep: 0, cook: total, total };
}

const quick: Collection = {
  slug: "quick-meals",
  title: "Quick meals",
  description: "Ready in 30 minutes or less.",
  rule: { kind: "max-total-minutes", minutes: 30 },
};

describe("categories", () => {
  it("every schema category has copy, in schema order", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([...recipeCategories]);
    for (const c of CATEGORIES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    }
    expect(getCategory("swallow").label).toBe("Swallow & sides");
  });

  it("validates ids for routes", () => {
    expect(isRecipeCategory("plantain")).toBe(true);
    expect(isRecipeCategory("pizza")).toBe(false);
    expect(isRecipeCategory("")).toBe(false);
    expect(categoryHref("beans-legumes")).toBe("/recipes/categories/beans-legumes");
  });

  it("membership and counts come only from a recipe's own categories", () => {
    const recipes = [
      recipe("a", { categories: ["rice"] }),
      recipe("b", { categories: ["rice", "plantain"] }),
      recipe("c", { categories: ["swallow", "swallow"] as Recipe["categories"] }),
    ];
    expect(inCategory(recipes[1], "plantain")).toBe(true);
    expect(inCategory(recipes[0], "plantain")).toBe(false);
    const counts = countByCategory(recipes);
    expect(counts).toMatchObject({ rice: 2, plantain: 1, swallow: 1, drinks: 0 });
  });

  it("labels counts honestly", () => {
    expect(recipeCountLabel(0)).toBe("No recipes yet");
    expect(recipeCountLabel(1)).toBe("1 recipe");
    expect(recipeCountLabel(4)).toBe("4 recipes");
  });
});

describe("collections", () => {
  it("shipped collections parse, have unique slugs, and load through the repository", async () => {
    const parsed = collectionsSchema.parse(collectionsJson);
    expect(parsed.map((c) => c.slug)).toEqual([
      "quick-meals",
      "everyday-cooking",
      "weekend-cooking",
      "one-pot-meals",
      "beginner-friendly",
    ]);
    const repo = getCollectionRepository();
    expect((await repo.getBySlug("one-pot-meals")).title).toBe("One-pot meals");
    await expect(repo.getBySlug("nope")).rejects.toThrow(/not found/);
  });

  it("rejects duplicate slugs and unknown rule kinds", () => {
    expect(collectionsSchema.safeParse([quick, quick]).success).toBe(false);
    expect(
      collectionsSchema.safeParse([{ ...quick, rule: { kind: "popular", count: 5 } }]).success,
    ).toBe(false);
  });

  it("matches each rule kind against real recipe data only", () => {
    expect(matchesRule(recipe("a", { timeMinutes: minutes(30) }), quick.rule)).toBe(true);
    expect(matchesRule(recipe("a", { timeMinutes: minutes(31) }), quick.rule)).toBe(false);
    // Missing time never counts as quick.
    expect(matchesRule(recipe("a", { timeMinutes: minutes(0) }), quick.rule)).toBe(false);
    const long = { kind: "min-total-minutes", minutes: 90 } as const;
    expect(matchesRule(recipe("a", { timeMinutes: minutes(90) }), long)).toBe(true);
    expect(matchesRule(recipe("a", { timeMinutes: minutes(89) }), long)).toBe(false);
    const onePot = { kind: "tag", tag: "one-pot" } as const;
    expect(matchesRule(recipe("a", { tags: ["one-pot"] }), onePot)).toBe(true);
    expect(matchesRule(recipe("a", { tags: [] }), onePot)).toBe(false);
    const easy = { kind: "difficulty", difficulty: "easy" } as const;
    expect(matchesRule(recipe("a", { difficulty: "easy" }), easy)).toBe(true);
    // No difficulty set = not assessed, never "beginner-friendly".
    expect(matchesRule(recipe("a"), easy)).toBe(false);
  });

  it("derives members in catalog order without copying recipes", () => {
    const recipes = [
      recipe("slow", { timeMinutes: minutes(120) }),
      recipe("fast-1", { timeMinutes: minutes(20) }),
      recipe("fast-2", { timeMinutes: minutes(25) }),
    ];
    const members = recipesInCollection(recipes, quick);
    expect(members.map((r) => r.id)).toEqual(["fast-1", "fast-2"]);
    expect(members[0]).toBe(recipes[1]);
  });

  it("only advertises collections with enough recipes, covered by the first member", () => {
    const tagged: Collection = { ...quick, slug: "one-pot", rule: { kind: "tag", tag: "one-pot" } };
    const recipes = [
      recipe("fast", { timeMinutes: minutes(20) }),
      recipe("fast-2", { timeMinutes: minutes(10) }),
    ];
    const visible = visibleCollections([quick, tagged], recipes, toSummary);
    expect(visible).toHaveLength(1);
    expect(visible[0]).toMatchObject({ count: 2, cover: { id: "fast" } });
    expect(visibleCollections([quick], recipes, toSummary, 3)).toEqual([]);
    expect(visibleCollections([quick], recipes, toSummary, 0)).toHaveLength(1);
    expect(collectionHref("quick-meals")).toBe("/recipes/collections/quick-meals");
  });

  it("the shipped demo recipe joins no collection (35 min, no tags/difficulty)", async () => {
    const collections = await getCollectionRepository().list();
    expect(visibleCollections(collections, [seed], toSummary)).toEqual([]);
  });
});
