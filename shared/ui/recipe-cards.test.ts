import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CollectionHeading,
  CompactRecipeCard,
  EmptyCollectionState,
  FeaturedRecipeCard,
  HorizontalRecipeList,
  RecipeCard,
  RecipeCollectionSection,
  RecipeGrid,
} from "./index";

const el = React.createElement;

describe("RecipeCard", () => {
  it("renders title as an accessible link when href is provided", () => {
    const html = renderToStaticMarkup(
      el(RecipeCard, { title: "Jollof Rice", href: "/recipes/jollof-rice", minutes: 45 }),
    );
    expect(html).toContain('href="/recipes/jollof-rice"');
    expect(html).toContain("Jollof Rice");
    expect(html).toContain("45 min");
  });

  it("renders plain title without link when href is absent", () => {
    const html = renderToStaticMarkup(el(RecipeCard, { title: "Pounded Yam" }));
    expect(html).not.toContain("<a ");
    expect(html).toContain("Pounded Yam");
  });

  it("shows difficulty badge only when defined in data", () => {
    const withDiff = renderToStaticMarkup(
      el(RecipeCard, { title: "Egusi Soup", difficulty: "medium" }),
    );
    expect(withDiff).toContain("Medium");

    const withoutDiff = renderToStaticMarkup(el(RecipeCard, { title: "Egusi Soup" }));
    expect(withoutDiff).not.toContain("Medium");
    expect(withoutDiff).not.toContain("Easy");
  });

  it("shows honest Demo badge only when demo is true", () => {
    const demoCard = renderToStaticMarkup(
      el(RecipeCard, { title: "Demo Dish", demo: true, href: "/recipes/demo" }),
    );
    expect(demoCard).toContain("Demo");

    const nonDemoCard = renderToStaticMarkup(
      el(RecipeCard, { title: "Real Dish", demo: false, href: "/recipes/real" }),
    );
    expect(nonDemoCard).not.toContain(">Demo<");
  });

  it("renders save button with aria-pressed and label when onSaveToggle is supplied", () => {
    const html = renderToStaticMarkup(
      el(RecipeCard, {
        title: "Fried Plantain",
        href: "/recipes/plantain",
        saved: true,
        onSaveToggle: () => {},
      }),
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Remove Fried Plantain from saved"');
    expect(html).toContain("<button");
  });

  it("omits save button when onSaveToggle is not provided", () => {
    const html = renderToStaticMarkup(el(RecipeCard, { title: "Fried Plantain" }));
    expect(html).not.toContain("<button");
  });

  it("renders image fallback with alt text", () => {
    const html = renderToStaticMarkup(
      el(RecipeCard, {
        title: "Suya",
        image: { src: "/images/suya.jpg", alt: "Spicy grilled beef skewers" },
      }),
    );
    expect(html).toContain('src="/images/suya.jpg"');
    expect(html).toContain('alt="Spicy grilled beef skewers"');
  });

  it("renders honest fallback tile when image is missing", () => {
    const html = renderToStaticMarkup(el(RecipeCard, { title: "Suya" }));
    expect(html).toContain("Photo coming soon");
  });
});

describe("CompactRecipeCard", () => {
  it("renders horizontal compact layout with time and difficulty", () => {
    const html = renderToStaticMarkup(
      el(CompactRecipeCard, {
        title: "Quick Stew",
        href: "/recipes/stew",
        minutes: 20,
        difficulty: "easy",
        category: "Stews",
      }),
    );
    expect(html).toContain("Quick Stew");
    expect(html).toContain("20 min");
    expect(html).toContain("Easy");
    expect(html).toContain('href="/recipes/stew"');
  });

  it("supports save button in compact layout", () => {
    const html = renderToStaticMarkup(
      el(CompactRecipeCard, {
        title: "Pepper Soup",
        saved: false,
        onSaveToggle: () => {},
      }),
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Save Pepper Soup for later"');
  });
});

describe("FeaturedRecipeCard", () => {
  it("renders dark anchor card with title, real time, servings, and CTA", () => {
    const html = renderToStaticMarkup(
      el(FeaturedRecipeCard, {
        title: "Sunday Jollof Feast",
        href: "/recipes/sunday-jollof",
        minutes: 60,
        servings: 8,
        difficulty: "medium",
        demo: true,
      }),
    );
    expect(html).toContain("Sunday Jollof Feast");
    expect(html).toContain("Featured recipe");
    expect(html).toContain("1 hr");
    expect(html).toContain("Serves 8");
    expect(html).toContain("Medium");
    expect(html).toContain("Sample recipe for development. Not chef-tested.");
    expect(html).toContain("View recipe");
  });
});

describe("CollectionHeading", () => {
  it("renders section title and metadata with semantic heading", () => {
    const html = renderToStaticMarkup(
      el(CollectionHeading, {
        id: "quick-meals-heading",
        title: "Quick Meals",
        meta: "6 recipes",
        description: "Ready in 30 minutes or less",
      }),
    );
    expect(html).toContain('id="quick-meals-heading"');
    expect(html).toContain("Quick Meals");
    expect(html).toContain("6 recipes");
    expect(html).toContain("Ready in 30 minutes or less");
    expect(html).toContain("<h2");
  });

  it("respects heading level 3 when specified", () => {
    const html = renderToStaticMarkup(el(CollectionHeading, { title: "Sub-collection", level: 3 }));
    expect(html).toContain("<h3");
  });
});

describe("EmptyCollectionState", () => {
  it("renders reassuring empty state with role=status", () => {
    const html = renderToStaticMarkup(
      el(EmptyCollectionState, {
        title: "No saved recipes",
        message: "Recipes you save will appear here.",
      }),
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("No saved recipes");
    expect(html).toContain("Recipes you save will appear here.");
  });
});

describe("RecipeGrid & HorizontalRecipeList", () => {
  const sampleRecipes = [
    {
      id: "r1",
      slug: "r1-slug",
      title: "Recipe 1",
      totalMinutes: 30,
      servings: 4,
      stepCount: 4,
      categories: ["rice"] as ["rice"],
      demo: true,
    },
    {
      id: "r2",
      slug: "r2-slug",
      title: "Recipe 2",
      totalMinutes: 45,
      servings: 2,
      stepCount: 5,
      categories: ["breakfast"] as ["breakfast"],
      demo: false,
    },
  ];

  it("renders responsive grid with recipe items", () => {
    const html = renderToStaticMarkup(el(RecipeGrid, { recipes: sampleRecipes, from: "/recipes" }));
    expect(html).toContain("grid-cols-2");
    expect(html).toContain("Recipe 1");
    expect(html).toContain("Recipe 2");
    expect(html).toContain('href="/recipes/r1-slug?from=%2Frecipes"');
  });

  it("renders horizontal list with thumb-friendly scrolling container", () => {
    const html = renderToStaticMarkup(
      el(HorizontalRecipeList, { recipes: sampleRecipes, from: "/", label: "Popular" }),
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Popular"');
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("snap-mandatory");
  });
});

describe("RecipeCollectionSection", () => {
  it("renders section with heading and grid when recipes are present", () => {
    const html = renderToStaticMarkup(
      el(RecipeCollectionSection, {
        id: "staples-heading",
        title: "Nigerian Staples",
        recipes: [
          {
            id: "r1",
            slug: "jollof",
            title: "Jollof",
            totalMinutes: 40,
            servings: 4,
            stepCount: 3,
            categories: ["rice"],
            demo: true,
          },
        ],
      }),
    );
    expect(html).toContain('aria-labelledby="staples-heading"');
    expect(html).toContain("Nigerian Staples");
    expect(html).toContain("Jollof");
  });

  it("renders EmptyCollectionState when recipes array is empty", () => {
    const html = renderToStaticMarkup(
      el(RecipeCollectionSection, {
        id: "empty-heading",
        title: "Empty Collection",
        recipes: [],
        emptyTitle: "Nothing here yet",
        emptyMessage: "Check back later.",
      }),
    );
    expect(html).toContain("Nothing here yet");
    expect(html).toContain("Check back later.");
  });
});
