import { describe, expect, it } from "vitest";
import { canTransition, isChefTested, recipeSchema } from "./recipe-schema";
import seedJson from "../../content/seed/demo-tomato-rice.json";

const base = () => JSON.parse(JSON.stringify(seedJson));

describe("demo seed", () => {
  it("parses as a valid recipe", () => {
    const recipe = recipeSchema.parse(base());
    expect(recipe.demo).toBe(true);
    expect(recipe.status).toBe("draft");
    expect(recipe.steps).toHaveLength(3);
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

  it("rejects demo content marked published", () => {
    const bad = base();
    bad.status = "published";
    bad.testedBy = "Nobody";
    expect(() => recipeSchema.parse(bad)).toThrow(/demo content/);
  });

  it("requires testedBy once past review", () => {
    const bad = base();
    bad.demo = false;
    bad.status = "tested";
    expect(() => recipeSchema.parse(bad)).toThrow(/testedBy/);
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
