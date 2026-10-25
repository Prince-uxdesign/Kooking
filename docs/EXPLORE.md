# Fork — Explore (Phase 8)

Status: **Implemented and verified.** Discovery for people who know the dish (search entry) and people who want ideas (categories, collections, everything). The search engine itself is Phase 9.

## 1. Routes

| Route                               | Purpose                                                           | Rendering                  |
| ----------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| `/recipes`                          | Explore landing; live search + filters (Phase 9, see `SEARCH.md`) | Dynamic (per request)      |
| `/recipes/categories/[category]`    | One category's recipes; chip row switches category in place       | Static; unknown id → 404   |
| `/recipes/collections/[collection]` | One collection's recipes; chip row switches collection            | Static; unknown slug → 404 |
| `/recipes/[slug]`                   | Recipe stub; back link returns to where the card was tapped       | Static                     |

Redirects (in `next.config.ts`, so they are real 307s): `/recipes/categories` and `/recipes/collections` → `/recipes`. (The Phase 8 legacy `?category=` redirect was removed in Phase 9: `category` is now a search filter.) Recipe slugs `categories` and `collections` are reserved by the schema.

## 2. Sections (Explore landing, phone order)

1. **Header:** "Explore" + one-line intro ("No need to know the name").
2. **Search pill** (`features/recipes/RecipeSearchForm`, shared with Home). A query is echoed in a status row ("Search for “…” is coming soon") with a Clear action — no fake results.
3. **Categories:** `Chip` row (`CategoryChips`), all 10 schema categories.
4. **Collections:** `ListGroup` rows (`CollectionList`) — only collections with ≥ 1 recipe. Each row: first member's photo (or rule icon), title, "N recipes · description". If none qualify, a one-line note.
5. **All recipes:** count + `RecipeGrid` (2-up, 3-up from 768px), or `EmptyState`.

Category and collection pages: back pill to Explore → icon + title + description + count (`DiscoveryHeader`) → chip row with the current item selected (scrolled into view on phones) → grid or `EmptyState` with "Browse all recipes".

## 3. Data model changes

- **Categories** (`recipeCategories`): added `swallow`, `beans-legumes`, `plantain` (now 10). Copy per category lives in `shared/domain/categories.ts`, keyed by the enum so none can ship unlabeled. Membership = a recipe's own `categories`; nothing is reassigned to fill a page.
- **Difficulty:** optional `difficulty: "easy" | "medium" | "challenging"`. Content-assigned only; absent = not assessed and nothing is shown.
- **Collections** (`content/collections.json`, schema in `shared/domain/collections.ts`): `{ slug, title, description, rule }` where `rule` is one of `max-total-minutes`, `min-total-minutes`, `tag`, `difficulty`. Members are derived — no recipe ids are stored, so nothing is duplicated and a collection can only claim what the data says. New collection = add a JSON entry; icons come from the rule kind, so no UI change.
- Shipped collections: Quick meals (≤ 30 min), Everyday cooking (tag `everyday`), Weekend cooking (≥ 90 min), One-pot meals (tag `one-pot`), Beginner-friendly (difficulty `easy`). Zero-minute times never count as quick.
- **Back links:** cards link to `/recipes/<slug>?from=<page>`; `backTargetFor()` only honours `/`, `/recipes`, and valid category/collection paths (no open redirects), else Explore.

## 4. Responsive

- **< 640px:** 20px gutters; chip rows scroll horizontally (44px pills, bleed to the edge, selected chip centred); collections as full-width rows; 2-up cards. Image fallbacks drop their caption below 200px wide (container query) so narrow cards never clip.
- **640–1024px:** chips wrap; 3-up cards from 768px.
- **≥ 1024px:** sidebar shell; collections list capped at `max-w-3xl` so rows don't stretch; cards 3-up within the 1120px container.

## 5. States

Catalog or collection-file failure → `ErrorState` (chips still work). Empty category/collection → `EmptyState` + "Browse all recipes". Empty catalog → `EmptyState` on Explore. `app/(main)/recipes/loading.tsx` skeleton. Missing photo → fallback tile; broken photo → fallback, including failures that happen before hydration.

## 6. With today's content

One demo recipe (rice, 35 min, no tags or difficulty): Rice dishes shows it; the other 9 categories show their empty state; no collection qualifies, so Explore shows the collections note. Populated layouts were verified with temporary demo fixtures that were removed afterwards.
