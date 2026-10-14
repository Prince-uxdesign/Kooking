import { describe, expect, it } from "vitest";
import ingredientsJson from "../../content/ingredients.json";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { getIngredientRepository, getRecipeRepository } from "@/shared/data/catalog";
import { isListable } from "./discovery";
import { backTargetFor } from "./navigation";
import { recipeSchema, type Recipe, type ReusableIngredient } from "./recipe-schema";
import {
  EMPTY_SEARCH,
  activeFilters,
  buildSearchIndex,
  clearFilters,
  computeFacets,
  filterCount,
  isSearchActive,
  normalize,
  parseSearchState,
  removeFilter,
  searchRecipes,
  searchStateHref,
  serializeSearchState,
  tokenize,
  toggleFilter,
  type SearchState,
} from "./search";

const seed = recipeSchema.parse(seedJson);

const catalog: ReusableIngredient[] = [
  { id: "i:rice", name: "Long-grain rice", aliases: [] },
  { id: "i:chicken", name: "Chicken thighs", aliases: [] },
  { id: "i:beans", name: "Black-eyed beans", aliases: ["ewa"] },
  { id: "i:plantain", name: "Ripe plantain", aliases: ["dodo"] },
  { id: "i:pepper", name: "Scotch bonnet pepper", aliases: ["ata rodo"] },
  { id: "i:tomato", name: "Tomatoes", aliases: [] },
];

function line(id: string, ingredientId: string, role: Recipe["ingredients"][number]["role"]) {
  return {
    id,
    ingredientId,
    quantity: 1,
    unit: "piece" as const,
    role,
    scaling: "discrete" as const,
    ...(role === "substitutable" ? { substitutes: ["i:chicken"] } : {}),
  };
}

function recipe(id: string, overrides: Partial<Recipe> = {}, ingredientIds: string[] = []): Recipe {
  const ingredients = ingredientIds.length
    ? ingredientIds.map((ing, n) => line(`${id}-l${n}`, ing, "required"))
    : seed.ingredients;
  return recipeSchema.parse({
    ...seed,
    id,
    slug: id,
    title: id,
    tags: [],
    description: undefined,
    ...overrides,
    ingredients,
    steps: [{ id: `${id}-s1`, order: 1, instruction: "Cook.", ingredientIds: [] }],
  });
}

function minutes(total: number) {
  return { prep: 0, cook: total, total };
}

const recipes: Recipe[] = [
  recipe(
    "jollof",
    {
      title: "Party Jollof Rice",
      categories: ["rice"],
      timeMinutes: minutes(60),
      tags: ["one-pot"],
    },
    ["i:rice", "i:tomato", "i:pepper"],
  ),
  recipe(
    "beans-porridge",
    {
      title: "Beans Porridge",
      categories: ["beans-legumes"],
      timeMinutes: minutes(90),
      difficulty: "easy",
      tags: ["everyday", "one-pot"],
    },
    ["i:beans", "i:plantain"],
  ),
  recipe(
    "dodo",
    {
      title: "Dodo",
      categories: ["plantain", "sides"],
      timeMinutes: minutes(15),
      difficulty: "easy",
    },
    ["i:plantain"],
  ),
  recipe(
    "fried-rice",
    {
      title: "Nigerian Fried Rice",
      categories: ["rice"],
      timeMinutes: minutes(25),
      difficulty: "medium",
      description: "Pairs well with chicken and plantain.",
    },
    ["i:rice"],
  ),
  recipe(
    "pepper-soup",
    { title: "Chicken Pepper Soup", categories: ["stews-soups"], timeMinutes: minutes(0) },
    ["i:chicken", "i:pepper"],
  ),
];

const index = buildSearchIndex(recipes, catalog);

function ids(state: Partial<SearchState>) {
  return searchRecipes(index, { ...EMPTY_SEARCH, ...state }).map((r) => r.summary.id);
}

describe("search: normalization", () => {
  it("lowercases, strips accents and punctuation, collapses whitespace", () => {
    expect(normalize("  Tomato  PURÉE, (fresh)!  ")).toBe("tomato puree fresh");
    expect(tokenize("  Rice   WITH  plantain ")).toEqual(["rice", "plantain"]);
    expect(tokenize("rice rice")).toEqual(["rice"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("search: matching", () => {
  it("is case-insensitive and whitespace-tolerant", () => {
    expect(ids({ q: "JOLLOF" })).toEqual(["jollof"]);
    expect(ids({ q: "   party    jollof  " })).toEqual(["jollof"]);
  });

  it("matches partial words (prefix, and mid-word from 3 letters)", () => {
    expect(ids({ q: "jol" })).toEqual(["jollof"]);
    expect(ids({ q: "llof" })).toEqual(["jollof"]);
    // Two letters only match word starts: "dg" is inside "porridge" but starts no word.
    expect(ids({ q: "dg" })).toEqual([]);
    // "do" starts "Dodo" (title, ranked first) and the plantain alias "dodo".
    expect(ids({ q: "do" })).toEqual(["dodo", "beans-porridge"]);
  });

  it("finds recipes by structured ingredient, with an honest reason", () => {
    const results = searchRecipes(index, { ...EMPTY_SEARCH, q: "chicken" });
    // Pepper soup has chicken in its title and lines; fried rice only mentions it.
    expect(results.map((r) => r.summary.id)).toEqual(["pepper-soup", "fried-rice"]);
    expect(results[1].reason).toBe("Mentioned in description");
    const beans = searchRecipes(index, { ...EMPTY_SEARCH, q: "black-eyed" });
    expect(beans[0]).toMatchObject({ reason: "Contains black-eyed beans" });
  });

  it("never claims an ingredient from a description match alone", () => {
    const plantain = searchRecipes(index, { ...EMPTY_SEARCH, q: "plantain" });
    const fried = plantain.find((r) => r.summary.id === "fried-rice");
    expect(fried?.reason).toBe("Mentioned in description");
    expect(plantain.find((r) => r.summary.id === "beans-porridge")?.reason).toBe(
      "Contains ripe plantain",
    );
  });

  it("searches ingredient aliases and folds simple plurals", () => {
    expect(ids({ q: "ewa" })).toEqual(["beans-porridge"]);
    expect(ids({ q: "ata rodo" })).toEqual(["jollof", "pepper-soup"]);
    expect(ids({ q: "tomato" })).toEqual(["jollof"]);
    expect(ids({ q: "tomatoes" })).toEqual(["jollof"]);
    expect(ids({ q: "bean" })).toEqual(["beans-porridge"]);
  });

  it("searches category names and tags", () => {
    expect(ids({ q: "soup" })).toEqual(["pepper-soup"]);
    expect(ids({ q: "legumes" })).toEqual(["beans-porridge"]);
    const onePot = searchRecipes(index, { ...EMPTY_SEARCH, q: "one pot" });
    expect(onePot.map((r) => r.summary.id).sort()).toEqual(["beans-porridge", "jollof"]);
  });

  it("requires every term to match (AND), ranking title hits first", () => {
    expect(ids({ q: "rice plantain" })).toEqual(["fried-rice"]);
    expect(ids({ q: "rice" })).toEqual(["jollof", "fried-rice"]);
  });

  it("returns nothing for no-result queries", () => {
    expect(ids({ q: "pizza" })).toEqual([]);
    expect(ids({ q: "rice pizza" })).toEqual([]);
  });

  it("is deterministic: ties keep catalog order", () => {
    const a = ids({ q: "rice" });
    expect(ids({ q: "rice" })).toEqual(a);
    expect(ids({})).toEqual(recipes.map((r) => r.id));
  });
});

describe("search: filters", () => {
  it("applies multiple filters together (AND across, OR within)", () => {
    expect(ids({ categories: ["rice"] })).toEqual(["jollof", "fried-rice"]);
    expect(ids({ categories: ["rice", "plantain"] })).toEqual(["jollof", "dodo", "fried-rice"]);
    expect(ids({ categories: ["rice"], maxTime: 30 })).toEqual(["fried-rice"]);
    expect(ids({ difficulties: ["easy"], tags: ["one-pot"] })).toEqual(["beans-porridge"]);
  });

  it("composes search with filters", () => {
    expect(ids({ q: "rice", maxTime: 30 })).toEqual(["fried-rice"]);
    expect(ids({ q: "plantain", difficulties: ["easy"] })).toEqual(["beans-porridge", "dodo"]);
    expect(ids({ q: "rice", categories: ["stews-soups"] })).toEqual([]);
  });

  it("missing metadata never passes a filter", () => {
    // Pepper soup has no recorded time (0) and no difficulty.
    expect(ids({ maxTime: 90 })).not.toContain("pepper-soup");
    expect(ids({ difficulties: ["easy", "medium"] })).not.toContain("pepper-soup");
    expect(ids({ difficulties: ["easy", "medium"] })).not.toContain("jollof");
  });

  it("removes single filters and clears all, keeping the query", () => {
    let state: SearchState = { ...EMPTY_SEARCH, q: "rice" };
    state = toggleFilter(state, "category", "rice");
    state = toggleFilter(state, "maxTime", "30");
    state = toggleFilter(state, "tag", "one-pot");
    expect(filterCount(state)).toBe(3);
    expect(activeFilters(state).map((f) => f.label)).toEqual([
      "Rice dishes",
      "30 min or less",
      "One-pot",
    ]);
    state = removeFilter(state, "tag", "one-pot");
    expect(state.tags).toEqual([]);
    expect(clearFilters(state)).toEqual({ ...EMPTY_SEARCH, q: "rice" });
  });

  it("treats max time as single-choice and ignores invalid values", () => {
    let state = toggleFilter(EMPTY_SEARCH, "maxTime", "30");
    state = toggleFilter(state, "maxTime", "60");
    expect(state.maxTime).toBe(60);
    expect(toggleFilter(state, "maxTime", "60").maxTime).toBeNull();
    expect(toggleFilter(state, "maxTime", "17")).toBe(state);
    expect(toggleFilter(state, "category", "pizza")).toBe(state);
    expect(toggleFilter(state, "tag", "vegan")).toBe(state);
    expect(removeFilter(state, "category", "rice")).toBe(state);
  });
});

describe("search: facets", () => {
  it("only offers options that exist in the data, with live counts", () => {
    const facets = computeFacets(index, EMPTY_SEARCH);
    expect(facets.category.map((o) => o.value)).toEqual([
      "rice",
      "stews-soups",
      "beans-legumes",
      "plantain",
      "sides",
    ]);
    expect(facets.difficulty.map((o) => o.value)).toEqual(["easy", "medium"]);
    expect(facets.tag.map((o) => [o.value, o.count])).toEqual([
      ["one-pot", 2],
      ["everyday", 1],
    ]);
    // 15 min matches dodo; no recipe takes 16–29 min besides fried rice (25).
    expect(facets.maxTime.map((o) => [o.value, o.count])).toEqual([
      ["15", 1],
      ["30", 2],
      ["45", 2],
      ["60", 3],
      ["90", 4],
    ]);
  });

  it("counts respect the query and the other facets, not their own", () => {
    const facets = computeFacets(index, { ...EMPTY_SEARCH, q: "rice", categories: ["rice"] });
    expect(facets.category.find((o) => o.value === "rice")).toMatchObject({
      count: 2,
      selected: true,
    });
    expect(facets.maxTime.find((o) => o.value === "30")?.count).toBe(1);
  });

  it("hides facets with no data at all", () => {
    const bare = buildSearchIndex([recipe("plain", { timeMinutes: minutes(0) })], catalog);
    const facets = computeFacets(bare, EMPTY_SEARCH);
    expect(facets.difficulty).toEqual([]);
    expect(facets.tag).toEqual([]);
    expect(facets.maxTime).toEqual([]);
  });
});

describe("search: URL state", () => {
  it("round-trips canonically and drops invalid values", () => {
    const state = parseSearchState(
      new URLSearchParams(
        "q=  egusi   soup &category=plantain&category=pizza&category=rice&maxTime=17&difficulty=easy&tag=demo&tag=one-pot",
      ),
    );
    expect(state).toEqual({
      q: "egusi soup",
      categories: ["rice", "plantain"],
      maxTime: null,
      difficulties: ["easy"],
      tags: ["one-pot"],
    });
    expect(serializeSearchState(state)).toBe(
      "q=egusi+soup&category=rice&category=plantain&difficulty=easy&tag=one-pot",
    );
    expect(parseSearchState(new URLSearchParams(serializeSearchState(state)))).toEqual(state);
    expect(parseSearchState({ q: ["a", "b"], maxTime: "30" })).toMatchObject({
      q: "a",
      maxTime: 30,
    });
  });

  it("knows when nothing is being searched", () => {
    expect(isSearchActive(EMPTY_SEARCH)).toBe(false);
    expect(isSearchActive({ ...EMPTY_SEARCH, q: "  the  " })).toBe(false);
    expect(isSearchActive({ ...EMPTY_SEARCH, maxTime: 30 })).toBe(true);
    expect(searchStateHref(EMPTY_SEARCH)).toBe("/recipes");
  });

  it("back links return to sanitized search results", () => {
    expect(backTargetFor("/recipes?q=rice&maxTime=30&evil=1")).toEqual({
      href: "/recipes?q=rice&maxTime=30",
      label: "Search results",
    });
    expect(backTargetFor("/recipes?evil=1")).toEqual({ href: "/recipes", label: "Explore" });
  });
});

describe("search: shipped catalog", () => {
  it("every recipe ingredient line resolves in the ingredient catalog", async () => {
    const known = new Set((await getIngredientRepository().list()).map((i) => i.id));
    expect(known.size).toBe(ingredientsJson.length);
    for (const r of await getRecipeRepository().list()) {
      for (const l of r.ingredients)
        expect(known, `${r.id}: ${l.ingredientId}`).toContain(l.ingredientId);
    }
  });

  it("finds the demo recipe by name, ingredient, and category", async () => {
    const live = buildSearchIndex(
      (await getRecipeRepository().list()).filter(isListable),
      await getIngredientRepository().list(),
    );
    const find = (q: string) => searchRecipes(live, { ...EMPTY_SEARCH, q });
    expect(find("tomato rice")).toHaveLength(1);
    expect(find("plantain")[0]?.reason).toBe("Optional: plantain");
    expect(find("salt")[0]?.reason).toBe("Optional: salt");
    // Tomato purée is only a substitute — the recipe doesn't contain it.
    expect(find("puree")).toEqual([]);
  });

  it("unknown ingredient ids are skipped, not guessed", () => {
    const doc = buildSearchIndex([recipe("x", {}, ["i:missing", "i:rice"])], catalog)[0];
    expect(doc.ingredients.map((i) => i.name)).toEqual(["Long-grain rice"]);
  });
});
