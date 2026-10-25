import { describe, expect, it } from "vitest";
import {
  canTransition,
  isChefTested,
  recipeSchema,
  validateRecipe,
  validateRecipeAgainstCatalog,
  type ReusableIngredient,
} from "./recipe-schema";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const base = () => JSON.parse(JSON.stringify(seedJson));

describe("demo seed", () => {
  it("parses as a valid recipe with Phase 12 structured fields", () => {
    const recipe = recipeSchema.parse(base());
    expect(recipe.demo).toBe(true);
    expect(recipe.status).toBe("draft");
    expect(recipe.steps).toHaveLength(3);
    expect(recipe.equipment).toHaveLength(3);
    expect(recipe.notes).toHaveLength(2);
    expect(recipe.provenance?.author).toBe("Fork Seed Engineering");
    expect(recipe.createdAt).toBe("2026-03-01T10:00:00.000Z");
    expect(recipe.updatedAt).toBe("2026-03-01T10:00:00.000Z");
    expect(recipe.ingredients[0].constraint).toBe("Must be drained thoroughly before steaming");
    expect(recipe.steps[0].ingredientQuantities).toEqual({ "demo-rice": 400 });
  });
});

describe("recipe validation", () => {
  it("rejects non-contiguous step orders", () => {
    const bad = base();
    bad.steps[1].order = 3;
    expect(() => recipeSchema.parse(bad)).toThrow(/contiguous/);
  });

  it("rejects duplicate step orders", () => {
    const bad = base();
    bad.steps[2].order = 2;
    expect(() => recipeSchema.parse(bad)).toThrow(/contiguous/);
  });

  it("rejects steps referencing unknown ingredient lines", () => {
    const bad = base();
    bad.steps[0].ingredientIds = ["nope"];
    expect(() => recipeSchema.parse(bad)).toThrow(/unknown ingredient/);
  });

  it("rejects substitutable lines without approved substitutes", () => {
    const bad = base();
    delete bad.ingredients[1].substitutes;
    expect(() => recipeSchema.parse(bad)).toThrow(/substitutes/);
  });

  it("rejects substitutes on non-substitutable lines", () => {
    const bad = base();
    bad.ingredients[0].substitutes = ["demo:anything"];
    expect(() => recipeSchema.parse(bad)).toThrow(/only substitutable/);
  });

  it("rejects an ingredient listing itself as a substitute", () => {
    const bad = base();
    bad.ingredients[1].substitutes = ["demo:tomato-paste"];
    expect(() => recipeSchema.parse(bad)).toThrow(/cannot list itself as a substitute/);
  });

  it("rejects quantities on to-taste lines", () => {
    const bad = base();
    bad.ingredients[2].quantity = 5;
    expect(() => recipeSchema.parse(bad)).toThrow(/to-taste/);
  });

  it("rejects quantities without units", () => {
    const bad = base();
    bad.ingredients[0].unit = null;
    expect(() => recipeSchema.parse(bad)).toThrow(/without a unit/);
  });

  it("rejects non-positive and non-finite quantities", () => {
    for (const qty of [0, -3]) {
      const bad = base();
      bad.ingredients[0].quantity = qty;
      expect(() => recipeSchema.parse(bad)).toThrow();
    }
  });

  it("rejects invalid serving counts", () => {
    for (const servings of [0, 25, 4.5]) {
      const bad = base();
      bad.baseServings = servings;
      expect(() => recipeSchema.parse(bad)).toThrow();
    }
  });

  it("rejects invalid units", () => {
    const bad = base();
    bad.ingredients[0].unit = "handfuls";
    expect(() => recipeSchema.parse(bad)).toThrow();
  });

  it("rejects timers under 5 seconds or over 24 hours", () => {
    const badShort = base();
    badShort.steps[1].timer = { durationSeconds: 3 };
    expect(() => recipeSchema.parse(badShort)).toThrow(/under 5s/);

    const badLong = base();
    badLong.steps[1].timer = { durationSeconds: 100_000 };
    expect(() => recipeSchema.parse(badLong)).toThrow();
  });

  it("rejects duplicate equipment identifiers", () => {
    const bad = base();
    bad.equipment = [
      { id: "pot", name: "Pot A" },
      { id: "pot", name: "Pot B" },
    ];
    expect(() => recipeSchema.parse(bad)).toThrow(/equipment ids must be unique/);
  });

  it("validates step ingredientQuantities references and values", () => {
    const badRef = base();
    badRef.steps[0].ingredientQuantities = { "unknown-line": 100 };
    expect(() => recipeSchema.parse(badRef)).toThrow(/unknown ingredient line/);

    const badValue = base();
    badValue.steps[0].ingredientQuantities = { "demo-rice": -10 };
    expect(() => recipeSchema.parse(badValue)).toThrow(/finite positive number/);
  });

  it("rejects updatedAt that is earlier than createdAt", () => {
    const bad = base();
    bad.createdAt = "2026-03-01T12:00:00.000Z";
    bad.updatedAt = "2026-03-01T10:00:00.000Z";
    expect(() => recipeSchema.parse(bad)).toThrow(/updatedAt cannot be earlier than createdAt/);
  });

  it("rejects demo content marked tested, approved, or published", () => {
    for (const status of ["tested", "approved", "published"] as const) {
      const bad = base();
      bad.status = status;
      bad.testedBy = "Chef Verification";
      expect(() => recipeSchema.parse(bad)).toThrow(/demo content/);
    }
  });

  it("requires testedBy once past review", () => {
    const bad = base();
    bad.demo = false;
    bad.status = "tested";
    expect(() => recipeSchema.parse(bad)).toThrow(/testedBy/);
  });

  it("requires createdAt on published recipes", () => {
    const bad = base();
    bad.demo = false;
    bad.status = "published";
    bad.testedBy = "Chef Adeola";
    delete bad.createdAt;
    expect(() => recipeSchema.parse(bad)).toThrow(/createdAt timestamp/);
  });

  it("rejects inconsistent time totals", () => {
    const bad = base();
    bad.timeMinutes.total = 99;
    expect(() => recipeSchema.parse(bad)).toThrow(/prep \+ cook/);
  });

  it("rejects bad slugs and empty steps", () => {
    const badSlug = { ...base(), slug: "Not A Slug!" };
    expect(() => recipeSchema.parse(badSlug)).toThrow(/slug/);
    const noSteps = { ...base(), steps: [] };
    expect(() => recipeSchema.parse(noSteps)).toThrow();
  });
});

describe("status lifecycle", () => {
  it("allows only adjacent transitions", () => {
    expect(canTransition("draft", "in_review")).toBe(true);
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("approved", "published")).toBe(true);
    expect(canTransition("published", "in_review")).toBe(true);
    expect(canTransition("published", "draft")).toBe(false);
  });

  it("gates chef-tested claims on status", () => {
    expect(isChefTested("draft")).toBe(false);
    expect(isChefTested("in_review")).toBe(false);
    expect(isChefTested("tested")).toBe(true);
    expect(isChefTested("approved")).toBe(true);
    expect(isChefTested("published")).toBe(true);
  });
});

describe("validateRecipe helper", () => {
  it("returns success with validated data for valid payload", () => {
    const res = validateRecipe(base());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.id).toBe("demo-tomato-rice");
    }
  });

  it("returns formatted error messages for invalid payload", () => {
    const bad = base();
    bad.title = "";
    bad.baseServings = 99;
    const res = validateRecipe(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errors.length).toBeGreaterThan(0);
      expect(res.errors.some((e) => e.includes("baseServings"))).toBe(true);
    }
  });
});

describe("validateRecipeAgainstCatalog helper", () => {
  const dummyCatalog: ReusableIngredient[] = [
    { id: "demo:long-grain-rice", name: "Long-grain rice", aliases: [] },
    { id: "demo:tomato-paste", name: "Tomato paste", aliases: [] },
    { id: "demo:tomato-puree", name: "Tomato purée", aliases: [] },
    { id: "demo:salt", name: "Salt", aliases: [] },
    { id: "demo:plantain", name: "Plantain", aliases: [] },
  ];

  it("passes when all ingredients and substitute references exist in catalog", () => {
    const recipe = recipeSchema.parse(base());
    const result = validateRecipeAgainstCatalog(recipe, dummyCatalog);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects missing ingredient catalog references", () => {
    const incompleteCatalog = dummyCatalog.filter((i) => i.id !== "demo:plantain");
    const recipe = recipeSchema.parse(base());
    const result = validateRecipeAgainstCatalog(recipe, incompleteCatalog);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("demo:plantain"))).toBe(true);
  });

  it("detects missing substitute references in catalog", () => {
    const incompleteCatalog = dummyCatalog.filter((i) => i.id !== "demo:tomato-puree");
    const recipe = recipeSchema.parse(base());
    const result = validateRecipeAgainstCatalog(recipe, incompleteCatalog);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("demo:tomato-puree"))).toBe(true);
  });
});
