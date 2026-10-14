import { categoryHref, getCategory, isRecipeCategory } from "./categories";
import { collectionHref } from "./collections";
import { isSearchActive, parseSearchState, searchStateHref } from "./search";

export interface BackTarget {
  href: string;
  label: string;
}

/**
 * Where a recipe page's back link goes, from its `?from=` param.
 * Only known internal discovery routes are honoured (no open
 * redirects); anything else falls back to Explore. Search URLs are
 * re-parsed and re-serialized, so only known parameters survive.
 */
export function backTargetFor(
  from: string | null | undefined,
  collectionTitles: Record<string, string> = {},
): BackTarget {
  const fallback = { href: "/recipes", label: "Explore" };
  if (!from) return fallback;
  if (from === "/") return { href: "/", label: "Home" };
  if (from === "/recipes") return fallback;
  if (from.startsWith("/recipes?")) {
    const state = parseSearchState(new URLSearchParams(from.slice("/recipes?".length)));
    return isSearchActive(state)
      ? { href: searchStateHref(state), label: "Search results" }
      : fallback;
  }
  const category = /^\/recipes\/categories\/([a-z0-9-]+)$/.exec(from)?.[1];
  if (category && isRecipeCategory(category)) {
    return { href: categoryHref(category), label: getCategory(category).label };
  }
  const collection = /^\/recipes\/collections\/([a-z0-9-]+)$/.exec(from)?.[1];
  if (collection && collectionTitles[collection]) {
    return { href: collectionHref(collection), label: collectionTitles[collection] };
  }
  return fallback;
}

function withParams(path: string, params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== "") query.set(k, String(v));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Recipe page, optionally carrying servings and the discovery origin. */
export function recipeHref(
  slug: string,
  opts: { servings?: number | null; from?: string | null } = {},
): string {
  return withParams(`/recipes/${encodeURIComponent(slug)}`, {
    servings: opts.servings,
    from: opts.from,
  });
}

/** Kitchen Check for a recipe at a specific serving count. */
export function kitchenCheckHref(
  slug: string,
  opts: { servings: number; from?: string | null },
): string {
  return withParams(`/recipes/${encodeURIComponent(slug)}/kitchen-check`, {
    servings: opts.servings,
    from: opts.from,
  });
}
