# Kooking — Home Screen (Phase 7)

Status: **Implemented and verified.** Route: `app/(main)/page.tsx` (static). Sections: `features/home/`. Rules: `shared/domain/discovery.ts`, `shared/domain/history.ts`, `shared/domain/session.ts`.

Visual language: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) ("Clean Kitchen").

Home answers one question — _"What would I like to cook?"_ — and is deliberately not a feed.

## 1. Sections (phone order)

| Section          | Component          | Data source                                   | Shown when                                    |
| ---------------- | ------------------ | --------------------------------------------- | --------------------------------------------- |
| Greeting + H1    | `HomeGreeting`     | Device clock (after mount, no hydration skew) | Always. Neutral — no accounts, no names       |
| Search           | `HomeSearch`       | → `/recipes?q=` via `searchHref()`            | Always. GET form works before JS              |
| Continue cooking | `ContinueCooking`  | `LocalSessions.latestResumable()`             | Only for an active/paused session — else none |
| Featured recipe  | `FeaturedMeal`     | Catalog → `selectHomeContent().featured`      | First listable recipe; empty/error states     |
| Categories       | `CategoryGrid`     | `DISCOVERY_CATEGORIES`                        | Always. 7 Nigerian staples + Quick meals      |
| Recently viewed  | `RecentlyViewed`   | `LocalHistory` (`kooking:recent:v1`)          | Skeleton → list or one-line empty hint        |
| Explore recipes  | `RecipeCollection` | `selectHomeContent().collection`              | Catalog loaded; one-line note when empty      |
| Saved shortcut   | `SavedShortcut`    | Link to `/saved` — no counts                  | Always                                        |

Views are recorded by `features/recipes/RecordRecipeView` on `/recipes/[slug]` (a Phase 7 stub with real facts only: time, servings, demo label).

## 2. Honesty rules applied

- Listable = `published` **or** `demo`; real drafts never surface. Demo recipes carry a "Demo" badge and "Not chef-tested" copy.
- No ratings, popularity, or endorsements. The collection is "Explore recipes" (catalog order) because no popularity data exists.
- Difficulty is optional content (Phase 8) and shown only when set. Category tiles open `/recipes/categories/<id>`.
- "Quick meals" opens the `quick-meals` collection (total time ≤ 30 min, derived from data). Recipe links carry `?from=/` so their back link says "Home".
- Photos: optional `image { src, alt }` on recipes (site path or https only, alt required). Missing or broken images render a neutral "Photo coming soon" tile in the same box.

## 3. Responsive behavior

- **< 640px:** single column; category chips in one horizontally scrolling row; dark featured card stacks (inset 4:3 photo, full-width white pill CTA); recently viewed and Saved use gray list groups; continue card puts Resume on its own row; recipe grid 2-up.
- **640–1024px:** featured card side by side (photo left, copy right); category chips wrap; recently viewed 2-up; recipe grid 3-up from 768px.
- **≥ 1024px:** sidebar shell, content capped at 1120px, search capped at `max-w-2xl`.
- Verified at 320 / 375 / 430 / 768 / 1024 / 1280: no horizontal overflow, all targets ≥ 44px.

## 4. States

Catalog load failure → `ErrorState` in the featured slot; search and categories keep working. Empty catalog → `EmptyState` linking to Explore. Blocked or corrupt `localStorage` reads as empty (never crashes). Unknown recipe slugs return a true 404 (`dynamicParams = false` while the catalog is static).

## 5. Known limits

- Explore is built (see `EXPLORE.md`); search results ship in Phase 9.
- Only one demo recipe exists, so the collection shows its empty note. No extra recipes were invented.
- The continue card appears after hydration (it reads device storage), so a small layout shift occurs for users with an active session.
