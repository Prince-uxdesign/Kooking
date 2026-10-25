# Fork — Search and Filtering (Phase 9)

Status: **Implemented and verified.** Live search and filters on Explore (`/recipes`). Logic: `shared/domain/search.ts` (pure, tested). UI: `features/recipes/ExploreSearch.tsx`, `FilterSheet.tsx`.

## 1. What you can search

| Field                       | Source                                                          | Weight | Result reason shown          |
| --------------------------- | --------------------------------------------------------------- | ------ | ---------------------------- |
| Recipe name                 | `recipe.title`                                                  | 10     | — (title is visible)         |
| Ingredients (name, aliases) | Structured lines → `content/ingredients.json` by `ingredientId` | 6      | "Contains X" / "Optional: X" |
| Category                    | Category label + id ("Soups & stews", "beans-legumes")          | 4      | "In Soups & stews"           |
| Tags                        | `recipe.tags` ("one-pot" ↔ "one pot")                           | 3      | "Tagged one pot"             |
| Description keywords        | `recipe.description`                                            | 1      | "Mentioned in description"   |

Honesty rules: an ingredient claim ("Contains plantain") only ever comes from a recipe's structured ingredient lines. A description mention is labelled as such, never as an ingredient. **Substitutes are not indexed** (a recipe doesn't contain its substitutes), and lines whose `ingredientId` isn't in the catalog are skipped, never guessed. Optional and garnish lines say "Optional: X".

Matching:

- Case-insensitive, accent-insensitive (`purée` = `puree`), punctuation ignored, whitespace collapsed.
- Multi-word queries are AND: every term must match some field ("rice plantain"). Stopwords (and, with, the…) are dropped.
- Partial matches: any word prefix ("jol" → Jollof); inside a word from 3 letters ("llof"). Two letters only match word starts, so "ri" doesn't match "porridge".
- Simple plural folding: "beans" ↔ "bean", "tomatoes" ↔ "tomato".
- Ranking: sum of best field weight per term (word-start match ×2, mid-word ×1); ties keep catalog order. No query → catalog order. Fully deterministic.

## 2. Filters

| Filter     | URL param             | Rule                                                                                                        |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Category   | `category` (repeat)   | Recipe lists the category. OR within.                                                                       |
| Total time | `maxTime`             | 15/30/45/60/90; prep + cook ≤ value. Single choice. Time 0 (not recorded) never passes.                     |
| Difficulty | `difficulty` (repeat) | Content-set difficulty only; unassessed recipes never pass.                                                 |
| Tags       | `tag` (repeat)        | Allowlist (`FILTER_TAGS`: one-pot, everyday). Meta tags like `demo` and any dietary claims are not filters. |

Filters AND across types, OR within a type, and compose with the query. An option appears only if some recipe in the catalog has it (or it's selected), so no filter is offered without data; a facet with no options is hidden, and the Filters button disappears if nothing is filterable. Options show live counts (query + the other facets); zero-count options are disabled. No nutrition or dietary filters exist.

## 3. Interaction

- **Search field:** live results; the URL updates 200 ms after typing settles (`history.replaceState`, so no history spam and no server round trip). Enter applies immediately and hides the phone keyboard. Clear (×) resets at once.
- **Filters:** button (icon on phones, "Filters" label from 640px, count badge) opens a `BottomSheet`. Changes apply live behind the sheet; footer has "Clear all" and "Show N recipes".
- **Active filters:** removable chips under the search ("Remove filter: Rice dishes") plus "Clear all filters" (keeps the query).
- **Results:** "N recipes for “q” with M filters" (visible + polite live region), grid with match reasons, or an empty state with "Clear filters" / "Clear search".
- **Context:** the URL holds the full state, so reload, share, and back all work. Result cards link with `?from=<search URL>`; the recipe's back pill reads "Search results" and restores the exact search (sanitized: only known params survive).
- With nothing searched, Explore shows the Phase 8 browse sections.

## 4. Architecture and performance

- One index, built server-side per request from the same repositories everything else uses (`loadDiscovery` → recipes + ingredient catalog); no separate search dataset. Fields are pre-normalized once, so each keystroke only scans small strings.
- In-memory linear scan: right for a local catalog of tens to low hundreds of recipes. No external search service. If the catalog grows past ~1–2k recipes, swap `searchRecipes` for an inverted index behind the same function signature.
- Debounced URL commits (200 ms); results memoized on state; facet counts computed only while the sheet is open; filter availability computed once per index.
- `/recipes` is rendered per request so shared/reloaded search URLs arrive with results in the HTML.

## 5. Accessibility

Labelled search (`role="search"` form, visually hidden label); filter options are buttons with `aria-pressed` inside labelled `fieldset`s; the Filters button exposes `aria-haspopup`/`aria-expanded` and the active count; the sheet is a modal dialog that moves focus in, traps Tab, closes on Esc, restores focus to the trigger, and locks page scroll; result counts are announced politely.

## 6. Data added

`content/ingredients.json` (ingredient catalog, `reusableIngredientSchema` + optional `aliases` for local names). A test fails if any recipe line references an unknown ingredient.
