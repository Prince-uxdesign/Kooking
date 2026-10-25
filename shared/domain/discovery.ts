import { categoryHref, getCategory } from "./categories";
import { collectionHref } from "./collections";
import type { Recipe, RecipeCategory, RecipeDifficulty, RecipeImage } from "./recipe-schema";

/**
 * Discovery rules for Home and Explore. Pure: no React, no storage.
 * Nothing here ranks by popularity — Fork has no popularity data,
 * so ordering is catalog (editorial) order and labels say so.
 */

/** The fields a card needs. Keeps full recipes out of client bundles. */
export interface RecipeSummary {
  id: string;
  slug: string;
  title: string;
  totalMinutes: number;
  servings: number;
  stepCount: number;
  difficulty?: RecipeDifficulty;
  categories: Recipe["categories"];
  image?: RecipeImage;
  demo: boolean;
}

export function toSummary(recipe: Recipe): RecipeSummary {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    totalMinutes: recipe.timeMinutes.total,
    servings: recipe.baseServings,
    stepCount: recipe.steps.length,
    difficulty: recipe.difficulty,
    categories: recipe.categories,
    image: recipe.image,
    demo: recipe.demo,
  };
}

/**
 * What may appear in discovery: published recipes, real recipes in
 * review (shown to cooks during the user-testing phase — no tested
 * claim is ever rendered for them), and demo fixtures (labelled as
 * demo). Drafts never surface.
 */
export function isListable(recipe: Recipe): boolean {
  return recipe.status === "published" || recipe.status === "in_review" || recipe.demo;
}

export interface HomeContent {
  featured: RecipeSummary | null;
  /** Further recipes, excluding the featured one. Catalog order. */
  collection: RecipeSummary[];
}

/**
 * Featured = first listable recipe in catalog order (the catalog is
 * the editorial order until an editorial field exists).
 */
export function selectHomeContent(recipes: Recipe[], collectionSize = 6): HomeContent {
  const listable = recipes.filter(isListable).map(toSummary);
  const [featured = null, ...rest] = listable;
  return { featured, collection: rest.slice(0, collectionSize) };
}

/** Search entry point. Empty queries land on Explore without a `q`. */
export function searchHref(query: string): string {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 100);
  return q ? `/recipes?${new URLSearchParams({ q }).toString()}` : "/recipes";
}

export type DiscoveryCategoryId = RecipeCategory | "quick";

export interface DiscoveryCategory {
  id: DiscoveryCategoryId;
  label: string;
  href: string;
}

/** The collection Home's "Quick meals" tile opens. Must exist in content. */
export const QUICK_MEALS_COLLECTION_SLUG = "quick-meals";

/**
 * Home's eight entry points (one row on desktop): the Nigerian staples
 * plus Quick meals. Every other category lives on Explore.
 */
const HOME_CATEGORY_IDS: RecipeCategory[] = [
  "rice",
  "stews-soups",
  "swallow",
  "beans-legumes",
  "plantain",
  "breakfast",
  "snacks",
];

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  ...HOME_CATEGORY_IDS.map((id) => ({
    id,
    label: getCategory(id).label,
    href: categoryHref(id),
  })),
  { id: "quick", label: "Quick meals", href: collectionHref(QUICK_MEALS_COLLECTION_SLUG) },
];

/** Human time label: "35 min", "1 hr 10 min". Null for missing/zero. */
export function formatMinutes(minutes: number | undefined): string | null {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return null;
  const whole = Math.round(minutes);
  if (whole < 60) return `${whole} min`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

/** Neutral time-of-day greeting. Never pretends to know who you are. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

const DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  challenging: "Challenging",
};

export function difficultyLabel(difficulty: RecipeDifficulty | undefined): string | null {
  return difficulty ? DIFFICULTY_LABELS[difficulty] : null;
}
