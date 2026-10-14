import { CATEGORIES, getCategory, isRecipeCategory } from "./categories";
import { difficultyLabel, toSummary, type RecipeSummary } from "./discovery";
import {
  recipeDifficulties,
  type Recipe,
  type RecipeCategory,
  type RecipeDifficulty,
  type ReusableIngredient,
} from "./recipe-schema";

/**
 * Recipe search + filters. Pure and deterministic: the same index and
 * state always give the same results in the same order. Every screen
 * calls these functions — filter logic lives nowhere else.
 *
 * Strategy: the catalog is small and local, so search is an in-memory
 * scan over a pre-normalized index (built once per catalog), not an
 * external service or an inverted index.
 */

// ─── Text normalization ────────────────────────────────────────────

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["a", "an", "and", "the", "with", "of", "in", "for", "or", "to"]);

/** Query → unique search terms. Stopwords are dropped ("rice with plantain"). */
export function tokenize(query: string): string[] {
  return [...new Set(normalize(query).split(" "))].filter((t) => t && !STOPWORDS.has(t));
}

/** Simple plural folding so "beans" finds "bean" and "tomatoes" finds "tomato". */
function variants(term: string): string[] {
  const out = [term];
  if (term.length > 4 && term.endsWith("es")) out.push(term.slice(0, -2));
  if (term.length > 3 && term.endsWith("s")) out.push(term.slice(0, -1));
  return out;
}

/** 2 = a word starts with the term, 1 = inside a word, 0 = no match. */
function strength(haystack: string, term: string): number {
  if (!haystack) return 0;
  if (haystack.startsWith(term) || haystack.includes(` ${term}`)) return 2;
  // Mid-word matches need 3+ characters, or "ri" would match everything.
  return term.length >= 3 && haystack.includes(term) ? 1 : 0;
}

// ─── Index ─────────────────────────────────────────────────────────

export interface IndexedIngredient {
  /** Display name from the ingredient catalog. */
  name: string;
  /** Normalized name + aliases. */
  terms: string;
  optional: boolean;
}

export interface SearchDoc {
  summary: RecipeSummary;
  /** Catalog position — the tie-breaker and the no-query order. */
  order: number;
  title: string;
  ingredients: IndexedIngredient[];
  categories: { label: string; terms: string }[];
  tags: string[];
  description: string;
}

/**
 * Build the index from listable recipes (catalog order) and the
 * ingredient catalog. Ingredients come only from structured recipe
 * lines; ids missing from the catalog are skipped, never guessed.
 * Substitutes are not indexed — a recipe doesn't "contain" them.
 */
export function buildSearchIndex(
  recipes: Recipe[],
  ingredientCatalog: ReusableIngredient[],
): SearchDoc[] {
  const byId = new Map(ingredientCatalog.map((i) => [i.id, i]));
  return recipes.map((recipe, order) => {
    const seen = new Set<string>();
    const ingredients: IndexedIngredient[] = [];
    for (const line of recipe.ingredients) {
      const entry = byId.get(line.ingredientId);
      if (!entry || seen.has(entry.id)) continue;
      seen.add(entry.id);
      ingredients.push({
        name: entry.name,
        terms: normalize([entry.name, ...(entry.aliases ?? [])].join(" | ")),
        optional: line.role === "optional" || line.role === "garnish",
      });
    }
    return {
      summary: toSummary(recipe),
      order,
      title: normalize(recipe.title),
      ingredients,
      categories: recipe.categories.map((id) => ({
        label: getCategory(id).label,
        terms: normalize(`${getCategory(id).label} ${id}`),
      })),
      tags: recipe.tags.map(normalize),
      description: normalize(recipe.description ?? ""),
    };
  });
}

// ─── Search state (URL is the source of truth) ─────────────────────

export const MAX_TIME_OPTIONS = [15, 30, 45, 60, 90] as const;

/**
 * Tags offered as filters. An allowlist: content tags like "demo" are
 * not user-facing, and dietary claims are never filters unless
 * validated data exists for them.
 */
export const FILTER_TAGS: Record<string, string> = {
  "one-pot": "One-pot",
  everyday: "Everyday",
};

export interface SearchState {
  q: string;
  categories: RecipeCategory[];
  maxTime: number | null;
  difficulties: RecipeDifficulty[];
  tags: string[];
}

export const EMPTY_SEARCH: SearchState = {
  q: "",
  categories: [],
  maxTime: null,
  difficulties: [],
  tags: [],
};

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function all(params: Params, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);
  const v = params[key];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** Keep valid values only, de-duplicated, in a canonical order. */
function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return allowed.filter((a) => values.includes(a));
}

/** Parse URL params. Unknown or malformed values are ignored, never errors. */
export function parseSearchState(params: Params): SearchState {
  const q = (all(params, "q")[0] ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  const time = Number(all(params, "maxTime")[0]);
  return {
    q,
    categories: pick(
      all(params, "category"),
      CATEGORIES.map((c) => c.id),
    ),
    maxTime: (MAX_TIME_OPTIONS as readonly number[]).includes(time) ? time : null,
    difficulties: pick(all(params, "difficulty"), recipeDifficulties),
    tags: pick(all(params, "tag"), Object.keys(FILTER_TAGS)),
  };
}

/** Canonical query string (no leading "?"). Same state → same URL. */
export function serializeSearchState(state: SearchState): string {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  for (const c of state.categories) p.append("category", c);
  if (state.maxTime !== null) p.set("maxTime", String(state.maxTime));
  for (const d of state.difficulties) p.append("difficulty", d);
  for (const t of state.tags) p.append("tag", t);
  return p.toString();
}

export function searchStateHref(state: SearchState): string {
  const qs = serializeSearchState(state);
  return qs ? `/recipes?${qs}` : "/recipes";
}

export function filterCount(state: SearchState): number {
  return (
    state.categories.length +
    (state.maxTime === null ? 0 : 1) +
    state.difficulties.length +
    state.tags.length
  );
}

/** True when there is anything to search or filter by. */
export function isSearchActive(state: SearchState): boolean {
  return tokenize(state.q).length > 0 || filterCount(state) > 0;
}

// ─── Filter editing ────────────────────────────────────────────────

export type FilterKey = "category" | "maxTime" | "difficulty" | "tag";

export interface ActiveFilter {
  key: FilterKey;
  value: string;
  label: string;
}

export function maxTimeLabel(minutes: number): string {
  return `${minutes} min or less`;
}

/** Active filters, in display order, with human labels. */
export function activeFilters(state: SearchState): ActiveFilter[] {
  return [
    ...state.categories.map((c) => ({
      key: "category" as const,
      value: c,
      label: getCategory(c).label,
    })),
    ...(state.maxTime === null
      ? []
      : [
          {
            key: "maxTime" as const,
            value: String(state.maxTime),
            label: maxTimeLabel(state.maxTime),
          },
        ]),
    ...state.difficulties.map((d) => ({
      key: "difficulty" as const,
      value: d,
      label: difficultyLabel(d) ?? d,
    })),
    ...state.tags.map((t) => ({ key: "tag" as const, value: t, label: FILTER_TAGS[t] ?? t })),
  ];
}

function toggle<T extends string>(list: T[], value: T, allowed: readonly T[]): T[] {
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return pick(next, allowed);
}

/**
 * Turn one filter value on or off. Max time is single-choice: picking
 * the active value clears it. Invalid values leave state unchanged.
 */
export function toggleFilter(state: SearchState, key: FilterKey, value: string): SearchState {
  switch (key) {
    case "category":
      return isRecipeCategory(value)
        ? {
            ...state,
            categories: toggle(
              state.categories,
              value,
              CATEGORIES.map((c) => c.id),
            ),
          }
        : state;
    case "maxTime": {
      const minutes = Number(value);
      if (!(MAX_TIME_OPTIONS as readonly number[]).includes(minutes)) return state;
      return { ...state, maxTime: state.maxTime === minutes ? null : minutes };
    }
    case "difficulty":
      return (recipeDifficulties as readonly string[]).includes(value)
        ? {
            ...state,
            difficulties: toggle(state.difficulties, value as RecipeDifficulty, recipeDifficulties),
          }
        : state;
    case "tag":
      return value in FILTER_TAGS
        ? { ...state, tags: toggle(state.tags, value, Object.keys(FILTER_TAGS)) }
        : state;
  }
}

/** Remove one active filter (chip ×). */
export function removeFilter(state: SearchState, key: FilterKey, value: string): SearchState {
  const isOn = activeFilters(state).some((f) => f.key === key && f.value === value);
  return isOn ? toggleFilter(state, key, value) : state;
}

/** Clear every filter; the search text stays. */
export function clearFilters(state: SearchState): SearchState {
  return { ...EMPTY_SEARCH, q: state.q };
}

// ─── Matching ──────────────────────────────────────────────────────

/** Recipe facts a filter may test. Missing data never passes a filter. */
function passes(doc: SearchDoc, state: SearchState, skip?: FilterKey): boolean {
  const { summary } = doc;
  if (
    skip !== "category" &&
    state.categories.length > 0 &&
    !state.categories.some((c) => summary.categories.includes(c))
  ) {
    return false;
  }
  if (skip !== "maxTime" && state.maxTime !== null) {
    // 0 = time not recorded: unknown is not "quick".
    if (!(summary.totalMinutes > 0 && summary.totalMinutes <= state.maxTime)) return false;
  }
  if (
    skip !== "difficulty" &&
    state.difficulties.length > 0 &&
    !(summary.difficulty && state.difficulties.includes(summary.difficulty))
  ) {
    return false;
  }
  if (
    skip !== "tag" &&
    state.tags.length > 0 &&
    !state.tags.some((t) => doc.tags.includes(normalize(t)))
  ) {
    return false;
  }
  return true;
}

const WEIGHTS = { title: 10, ingredient: 6, category: 4, tag: 3, description: 1 } as const;

type Field = keyof typeof WEIGHTS;

interface TermMatch {
  score: number;
  field: Field;
  /** The ingredient or category that matched, for the result's reason. */
  detail?: string;
  optional?: boolean;
}

function matchTerm(doc: SearchDoc, term: string): TermMatch | null {
  let best: TermMatch | null = null;
  const consider = (field: Field, s: number, detail?: string, optional?: boolean) => {
    const score = WEIGHTS[field] * s;
    if (s > 0 && (!best || score > best.score)) best = { score, field, detail, optional };
  };
  for (const v of variants(term)) {
    consider("title", strength(doc.title, v));
    for (const ing of doc.ingredients) {
      consider("ingredient", strength(ing.terms, v), ing.name, ing.optional);
    }
    for (const cat of doc.categories) consider("category", strength(cat.terms, v), cat.label);
    for (const tag of doc.tags) consider("tag", strength(tag, v), tag);
    consider("description", strength(doc.description, v));
  }
  return best;
}

export interface SearchResult {
  summary: RecipeSummary;
  score: number;
  /**
   * Why it matched, when not obvious from the title. Ingredient
   * reasons come only from structured lines ("Contains plantain").
   */
  reason?: string;
}

function reasonFor(m: TermMatch): string | undefined {
  switch (m.field) {
    case "ingredient":
      return m.optional
        ? `Optional: ${m.detail?.toLowerCase()}`
        : `Contains ${m.detail?.toLowerCase()}`;
    case "category":
      return `In ${m.detail}`;
    case "tag":
      return `Tagged ${m.detail}`;
    case "description":
      return "Mentioned in description";
    default:
      return undefined;
  }
}

function scoreDoc(doc: SearchDoc, terms: string[]): SearchResult | null {
  let score = 0;
  let reason: string | undefined;
  for (const term of terms) {
    const m = matchTerm(doc, term);
    if (!m) return null; // every term must match something (AND)
    score += m.score;
    reason ??= reasonFor(m);
  }
  return { summary: doc.summary, score, reason };
}

/**
 * Search + filters together: a recipe must match every query term AND
 * every active filter. Ranked by relevance when there is a query,
 * otherwise catalog order; ties always fall back to catalog order.
 */
export function searchRecipes(index: SearchDoc[], state: SearchState): SearchResult[] {
  const terms = tokenize(state.q);
  const results: { r: SearchResult; order: number }[] = [];
  for (const doc of index) {
    if (!passes(doc, state)) continue;
    const r = terms.length ? scoreDoc(doc, terms) : { summary: doc.summary, score: 0 };
    if (r) results.push({ r, order: doc.order });
  }
  results.sort((a, b) => b.r.score - a.r.score || a.order - b.order);
  return results.map((x) => x.r);
}

// ─── Facets (filter options with counts) ───────────────────────────

export interface FacetOption {
  value: string;
  label: string;
  /** Results if this option were applied with everything else as is. */
  count: number;
  selected: boolean;
}

export interface Facets {
  category: FacetOption[];
  maxTime: FacetOption[];
  difficulty: FacetOption[];
  tag: FacetOption[];
}

/**
 * Filter options backed by data: an option appears only if at least
 * one recipe in the whole catalog has it (or it's selected), so no
 * filter promises data that doesn't exist. Counts respect the query
 * and the other facets (standard faceted search).
 */
export function computeFacets(index: SearchDoc[], state: SearchState): Facets {
  const terms = tokenize(state.q);
  const matching = terms.length ? index.filter((d) => scoreDoc(d, terms)) : index;
  const base = (skip: FilterKey) => matching.filter((d) => passes(d, state, skip));

  const build = (
    key: FilterKey,
    options: { value: string; label: string }[],
    has: (doc: SearchDoc, value: string) => boolean,
    isSelected: (value: string) => boolean,
  ): FacetOption[] => {
    const pool = base(key);
    return options
      .filter((o) => isSelected(o.value) || index.some((d) => has(d, o.value)))
      .map((o) => ({
        ...o,
        count: pool.filter((d) => has(d, o.value)).length,
        selected: isSelected(o.value),
      }));
  };

  return {
    category: build(
      "category",
      CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
      (d, v) => d.summary.categories.includes(v as RecipeCategory),
      (v) => state.categories.includes(v as RecipeCategory),
    ),
    maxTime: build(
      "maxTime",
      MAX_TIME_OPTIONS.map((m) => ({ value: String(m), label: maxTimeLabel(m) })),
      (d, v) => d.summary.totalMinutes > 0 && d.summary.totalMinutes <= Number(v),
      (v) => state.maxTime === Number(v),
    ),
    difficulty: build(
      "difficulty",
      recipeDifficulties.map((d) => ({ value: d, label: difficultyLabel(d) ?? d })),
      (d, v) => d.summary.difficulty === v,
      (v) => state.difficulties.includes(v as RecipeDifficulty),
    ),
    tag: build(
      "tag",
      Object.entries(FILTER_TAGS).map(([value, label]) => ({ value, label })),
      (d, v) => d.tags.includes(normalize(v)),
      (v) => state.tags.includes(v),
    ),
  };
}
