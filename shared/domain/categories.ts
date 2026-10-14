import { recipeCategories, type Recipe, type RecipeCategory } from "./recipe-schema";

/**
 * Category copy for discovery. Keyed by the schema enum, so a new
 * category cannot ship without a label. Descriptions say what a
 * category covers — they never imply recipes exist for each example.
 */
const DEFINITIONS: Record<RecipeCategory, { label: string; description: string }> = {
  rice: {
    label: "Rice dishes",
    description: "Jollof, fried rice, coconut rice, and other rice-based meals.",
  },
  "stews-soups": {
    label: "Soups & stews",
    description: "Tomato stews, leafy soups, and seed- or nut-based soups.",
  },
  swallow: {
    label: "Swallow & sides",
    description: "Eba, amala, pounded yam, fufu, and other swallows.",
  },
  breakfast: {
    label: "Breakfast",
    description: "Morning dishes such as akara, pap, and egg sauces.",
  },
  "beans-legumes": {
    label: "Beans & legumes",
    description: "Beans porridge, moi moi, ewa agoyin, and other bean dishes.",
  },
  plantain: {
    label: "Plantain dishes",
    description: "Dodo, boli, plantain porridge, and more.",
  },
  snacks: {
    label: "Snacks",
    description: "Small chops and snacks such as puff-puff and chin chin.",
  },
  sides: {
    label: "Sides",
    description: "Accompaniments that round out a meal.",
  },
  grills: {
    label: "Grills",
    description: "Suya, grilled fish, and other grilled or roasted dishes.",
  },
  drinks: {
    label: "Drinks",
    description: "Zobo, kunu, chapman, and other drinks.",
  },
};

export interface CategoryDefinition {
  id: RecipeCategory;
  label: string;
  description: string;
}

/** All categories, in schema (display) order. */
export const CATEGORIES: CategoryDefinition[] = recipeCategories.map((id) => ({
  id,
  ...DEFINITIONS[id],
}));

export function isRecipeCategory(value: string): value is RecipeCategory {
  return (recipeCategories as readonly string[]).includes(value);
}

export function getCategory(id: RecipeCategory): CategoryDefinition {
  return { id, ...DEFINITIONS[id] };
}

export function categoryHref(id: RecipeCategory): string {
  return `/recipes/categories/${id}`;
}

/** A recipe belongs to a category only if its content says so. */
export function inCategory(recipe: Recipe, id: RecipeCategory): boolean {
  return recipe.categories.includes(id);
}

/** Recipe counts per category over the given (already listable) recipes. */
export function countByCategory(recipes: Recipe[]): Record<RecipeCategory, number> {
  const counts = Object.fromEntries(recipeCategories.map((id) => [id, 0])) as Record<
    RecipeCategory,
    number
  >;
  for (const recipe of recipes) {
    for (const id of new Set(recipe.categories)) counts[id] += 1;
  }
  return counts;
}

/** "1 recipe", "3 recipes", "No recipes yet". */
export function recipeCountLabel(count: number): string {
  if (count <= 0) return "No recipes yet";
  return count === 1 ? "1 recipe" : `${count} recipes`;
}
