"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { recipeCountLabel } from "@/shared/domain/categories";
import {
  EMPTY_SEARCH,
  activeFilters,
  clearFilters,
  computeFacets,
  filterCount,
  isSearchActive,
  parseSearchState,
  removeFilter,
  searchRecipes,
  searchStateHref,
  toggleFilter,
  type FilterKey,
  type SearchDoc,
  type SearchState,
} from "@/shared/domain/search";
import { buttonClasses } from "@/shared/ui/Button";
import { ChipButton } from "@/shared/ui/Chip";
import { SearchInput } from "@/shared/ui/SearchInput";
import { EmptyState } from "@/shared/ui/States";
import { ChipRow } from "./ChipRow";
import { FilterSheet } from "./FilterSheet";
import { RecipeGrid } from "./RecipeGrid";

/** Typing settles for this long before the URL (and results) update. */
const TYPING_DEBOUNCE_MS = 200;

function cleanQuery(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 100);
}

/**
 * Explore search: live query + filters over the in-memory index. The
 * URL is the single source of truth (shareable, survives opening a
 * recipe and coming back). URL writes use history.replaceState, so
 * typing never adds history entries or round-trips to the server.
 * When nothing is searched, the browse content (children) shows.
 */
export function ExploreSearch({ index, children }: { index: SearchDoc[]; children: ReactNode }) {
  const params = useSearchParams();
  const state = useMemo(() => parseSearchState(new URLSearchParams(params.toString())), [params]);

  const [input, setInput] = useState(state.q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const lastWritten = useRef(state.q);

  const write = useCallback((next: SearchState) => {
    lastWritten.current = next.q;
    window.history.replaceState(null, "", searchStateHref(next));
  }, []);

  // Back/forward (or any outside URL change) updates the field.
  useEffect(() => {
    if (state.q !== lastWritten.current) {
      lastWritten.current = state.q;
      setInput(state.q);
    }
  }, [state.q]);

  // Debounced query → URL. Clearing applies at once.
  useEffect(() => {
    const q = cleanQuery(input);
    if (q === state.q) return;
    const timer = setTimeout(() => write({ ...state, q }), q ? TYPING_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [input, state, write]);

  // Filter edits carry the latest typed text, so nothing is lost mid-typing.
  const update = (next: SearchState) => write({ ...next, q: cleanQuery(input) });
  const onToggle = (key: FilterKey, value: string) => update(toggleFilter(state, key, value));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    write({ ...state, q: cleanQuery(input) });
    (document.activeElement as HTMLElement | null)?.blur(); // hide the phone keyboard
  };

  const results = useMemo(() => searchRecipes(index, state), [index, state]);
  // Which filters exist at all is a property of the catalog — computed once.
  const filtersAvailable = useMemo(() => {
    const f = computeFacets(index, EMPTY_SEARCH);
    return f.category.length + f.maxTime.length + f.difficulty.length + f.tag.length > 0;
  }, [index]);
  // Live counts are only needed while the sheet is open.
  const facets = useMemo(
    () => (sheetOpen ? computeFacets(index, state) : null),
    [sheetOpen, index, state],
  );

  const active = isSearchActive(state);
  const chips = activeFilters(state);
  const count = filterCount(state);

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex max-w-2xl items-center gap-2">
          <form role="search" onSubmit={onSubmit} className="min-w-0 flex-1">
            <SearchInput
              label="Search recipes by name, ingredient, or category"
              hideLabel
              value={input}
              onChange={setInput}
              placeholder="Search recipes or ingredients"
            />
          </form>
          {filtersAvailable && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-label={count ? `Filters, ${count} active` : "Filters"}
              className="relative inline-flex min-h-[56px] min-w-[56px] shrink-0 items-center justify-center gap-2 rounded-full bg-surface-100 px-4 text-[15px] text-ink-900 hover:bg-surface-200"
            >
              <SlidersHorizontal aria-hidden size={20} strokeWidth={1.75} />
              <span className="hidden sm:inline">Filters</span>
              {count > 0 && (
                <span
                  aria-hidden
                  className="tnum absolute -right-0.5 -top-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink-900 px-1.5 text-[12px] font-medium text-white sm:static"
                >
                  {count}
                </span>
              )}
            </button>
          )}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <ChipRow label="Active filters">
              {chips.map((f) => (
                <li key={`${f.key}:${f.value}`} className="shrink-0">
                  <ChipButton
                    onClick={() => update(removeFilter(state, f.key, f.value))}
                    label={`Remove filter: ${f.label}`}
                    trailingIcon={<X size={14} strokeWidth={2} />}
                  >
                    {f.label}
                  </ChipButton>
                </li>
              ))}
            </ChipRow>
            <button
              type="button"
              onClick={() => update(clearFilters(state))}
              className={buttonClasses({ variant: "tertiary", className: "w-fit -ml-4 sm:ml-0" })}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Always mounted so screen readers hear result changes. */}
      <p role="status" aria-live="polite" className="sr-only">
        {active ? resultSummary(results.length, state) : ""}
      </p>

      {active ? (
        <section aria-labelledby="results-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="results-heading" className="text-[20px] font-semibold leading-7 text-ink-900">
              Results
            </h2>
            <p className="tnum text-[15px] leading-6 text-ink-500">
              {resultSummary(results.length, state)}
            </p>
          </div>
          {results.length === 0 ? (
            <EmptyState
              title="No recipes match"
              message={emptyMessage(state)}
              action={
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={() => update(clearFilters(state))}
                      className={buttonClasses({ variant: "dark" })}
                    >
                      Clear filters
                    </button>
                  )}
                  {state.q && (
                    <button
                      type="button"
                      onClick={() => {
                        setInput("");
                        write({ ...state, q: "" });
                      }}
                      className={buttonClasses({ variant: "light" })}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              }
            />
          ) : (
            <RecipeGrid
              recipes={results.map((r) => r.summary)}
              reasons={Object.fromEntries(results.map((r) => [r.summary.id, r.reason]))}
              from={searchStateHref(state)}
            />
          )}
        </section>
      ) : (
        children
      )}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        facets={facets}
        onToggle={onToggle}
        onClearAll={() => update(clearFilters(state))}
        activeCount={count}
        resultCount={results.length}
      />
    </div>
  );
}

function resultSummary(n: number, state: SearchState): string {
  const base = n === 0 ? "No recipes" : recipeCountLabel(n);
  const q = state.q ? ` for “${state.q}”` : "";
  const f = filterCount(state);
  return `${base}${q}${f ? ` with ${f === 1 ? "1 filter" : `${f} filters`}` : ""}`;
}

function emptyMessage(state: SearchState): string {
  const hasFilters = filterCount(state) > 0;
  if (state.q && hasFilters) return "Try removing a filter or a word from your search.";
  if (state.q) return "Check the spelling, or try an ingredient such as rice, beans, or plantain.";
  return "No recipe has all of these. Try removing a filter.";
}
