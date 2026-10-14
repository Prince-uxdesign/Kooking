import { describe, expect, it } from "vitest";
import collectionsJson from "../../content/collections.json";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { SEED_RECIPES } from "@/content/seed";
import { getRecipeRepository } from "@/shared/data/catalog";
import {
  DISCOVERY_CATEGORIES,
  QUICK_MEALS_COLLECTION_SLUG,
  difficultyLabel,
  formatMinutes,
  greetingFor,
  isListable,
  recipeHref,
  searchHref,
  selectHomeContent,
  toSummary,
} from "./discovery";
import { backTargetFor } from "./navigation";
import { recipeCategories, recipeSchema, type Recipe } from "./recipe-schema";

const seed = recipeSchema.parse(seedJson);

function variant(id: string, overrides: Partial<Recipe> = {}): Recipe {
  return { ...seed, id, slug: id, title: `Recipe ${id}`, ...overrides };
}

describe("discovery: what may surface", () => {
  it("lists published recipes and labelled demo fixtures, never real drafts", () => {
    expect(isListable(seed)).toBe(true); // demo draft
    expect(isListable(variant("real-draft", { demo: false, status: "draft" }))).toBe(false);
    expect(isListable(variant("in-review", { demo: false, status: "in_review" }))).toBe(false);
    expect(
      isListable(variant("live", { demo: false, status: "published", testedBy: "Chef A" })),
    ).toBe(true);
  });

  it("summaries carry only real recipe facts", () => {
    expect(toSummary(seed)).toEqual({
      id: "demo-tomato-rice",
      slug: "demo-tomato-rice",
      title: seed.title,
      totalMinutes: 35,
      servings: 4,
      stepCount: 3,
      difficulty: undefined,
      categories: ["rice"],
      image: undefined,
      demo: true,
    });
  });
});

describe("discovery: home content selection", () => {
  it("features the first listable recipe and excludes it from the collection", () => {
    const recipes = [
      variant("hidden", { demo: false, status: "draft" }),
      variant("a"),
      variant("b"),
      variant("c"),
    ];
    const home = selectHomeContent(recipes);
    expect(home.featured?.id).toBe("a");
    expect(home.collection.map((r) => r.id)).toEqual(["b", "c"]);
  });

  it("caps the collection and handles single or empty catalogs", () => {
    const many = Array.from({ length: 10 }, (_, i) => variant(`r${i}`));
    expect(selectHomeContent(many, 4).collection).toHaveLength(4);
    expect(selectHomeContent([seed])).toMatchObject({ collection: [] });
    expect(selectHomeContent([])).toEqual({ featured: null, collection: [] });
  });

  it("the shipped catalog parses and features the demo recipe", async () => {
    const recipes = await getRecipeRepository().list();
    expect(recipes).toHaveLength(SEED_RECIPES.length);
    expect(recipes.every((r) => r.demo && r.status === "draft")).toBe(true);
    expect(selectHomeContent(recipes).featured?.slug).toBe("demo-tomato-rice");
  });
});

describe("discovery: links", () => {
  it("builds recipe and search hrefs into Explore", () => {
    expect(recipeHref("demo-tomato-rice")).toBe("/recipes/demo-tomato-rice");
    expect(searchHref("  jollof   rice ")).toBe("/recipes?q=jollof+rice");
    expect(searchHref("egg & yam")).toBe("/recipes?q=egg+%26+yam");
    expect(searchHref("   ")).toBe("/recipes");
    expect(searchHref("x".repeat(300))).toBe(`/recipes?q=${"x".repeat(100)}`);
  });

  it("adds a validated back-link origin to recipe links", () => {
    expect(recipeHref("demo-tomato-rice", "/recipes/categories/rice")).toBe(
      "/recipes/demo-tomato-rice?from=%2Frecipes%2Fcategories%2Frice",
    );
  });

  it("Home's tiles open real category pages plus the Quick meals collection", () => {
    const ids = DISCOVERY_CATEGORIES.map((c) => c.id);
    expect(ids).toHaveLength(8); // one row on desktop
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of DISCOVERY_CATEGORIES) {
      if (c.id === "quick") {
        expect(c.href).toBe(`/recipes/collections/${QUICK_MEALS_COLLECTION_SLUG}`);
        expect(collectionsJson.map((x) => x.slug)).toContain(QUICK_MEALS_COLLECTION_SLUG);
      } else {
        expect(recipeCategories).toContain(c.id);
        expect(c.href).toBe(`/recipes/categories/${c.id}`);
      }
    }
  });
});

describe("discovery: back links from recipe pages", () => {
  const titles = { "quick-meals": "Quick meals" };

  it("returns to known discovery routes with their names", () => {
    expect(backTargetFor("/", titles)).toEqual({ href: "/", label: "Home" });
    expect(backTargetFor("/recipes", titles)).toEqual({ href: "/recipes", label: "Explore" });
    expect(backTargetFor("/recipes/categories/swallow", titles)).toEqual({
      href: "/recipes/categories/swallow",
      label: "Swallow & sides",
    });
    expect(backTargetFor("/recipes/collections/quick-meals", titles)).toEqual({
      href: "/recipes/collections/quick-meals",
      label: "Quick meals",
    });
  });

  it("falls back to Explore for anything unknown or external", () => {
    const explore = { href: "/recipes", label: "Explore" };
    for (const from of [
      null,
      "",
      "https://evil.example.com",
      "//evil.example.com",
      "/recipes/categories/pizza",
      "/recipes/collections/nope",
      "/recipes/categories/rice/../../x",
      "javascript:alert(1)",
    ]) {
      expect(backTargetFor(from, titles)).toEqual(explore);
    }
  });
});

describe("discovery: display helpers", () => {
  it("formats minutes and hides missing or zero times", () => {
    expect(formatMinutes(35)).toBe("35 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(formatMinutes(70)).toBe("1 hr 10 min");
    expect(formatMinutes(0)).toBeNull();
    expect(formatMinutes(undefined)).toBeNull();
    expect(formatMinutes(Number.NaN)).toBeNull();
  });

  it("greets by time of day without naming anyone", () => {
    expect(greetingFor(6)).toBe("Good morning");
    expect(greetingFor(13)).toBe("Good afternoon");
    expect(greetingFor(19)).toBe("Good evening");
    expect(greetingFor(2)).toBe("Good evening");
  });

  it("labels difficulty only when content sets it", () => {
    expect(difficultyLabel("easy")).toBe("Easy");
    expect(difficultyLabel(undefined)).toBeNull();
  });
});

describe("recipe images", () => {
  it("accepts site paths and https with alt text; rejects anything else", () => {
    const withImage = (image: unknown) => recipeSchema.safeParse({ ...seedJson, image }).success;
    expect(withImage({ src: "/images/rice.jpg", alt: "Tomato rice in a pot" })).toBe(true);
    expect(withImage({ src: "https://cdn.example.com/r.jpg", alt: "Rice" })).toBe(true);
    expect(withImage({ src: "http://insecure.example.com/r.jpg", alt: "Rice" })).toBe(false);
    expect(withImage({ src: "//evil.example.com/r.jpg", alt: "Rice" })).toBe(false);
    expect(withImage({ src: "javascript:alert(1)", alt: "Rice" })).toBe(false);
    expect(withImage({ src: "/images/rice.jpg", alt: "" })).toBe(false);
    expect(withImage(undefined)).toBe(true);
  });

  it("reserves Explore path segments and validates difficulty", () => {
    expect(recipeSchema.safeParse({ ...seedJson, slug: "categories" }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...seedJson, slug: "collections" }).success).toBe(false);
    expect(recipeSchema.safeParse({ ...seedJson, difficulty: "easy" }).success).toBe(true);
    expect(recipeSchema.safeParse({ ...seedJson, difficulty: "expert" }).success).toBe(false);
  });
});
