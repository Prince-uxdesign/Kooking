# Kooking — Information Architecture (Phase 1)

Status: **Proposed — for review.** Defines routes, navigation, and page responsibilities. No UI built in this phase.

Design constraint: mobile-first, responsive to tablet/desktop with **one route tree** (no forked mobile/desktop apps). Cooking routes prioritize large touch targets, low cognitive load, and offline availability.

## 1. Route structure (final for MVP)

All routes are local-first. Recipe content may fetch remotely on first visit, but every route renders from cache when offline (except uncached deep links → `/offline` fallback).

| Route                                                                            | Purpose                                                                                                                                                         | Params / state                                                       | Offline                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `/`                                                                              | Home + discovery. Featured, recent, saved shortcuts. Entry to search.                                                                                           | Query `?resume=<sessionId>` for resume banner only                   | ✅ shell + cached features                 |
| `/recipes`                                                                       | Search + filtering (text, tag, time, difficulty if content provides it). Client-side over cached index in MVP.                                                  | URL search params: `?q=&tag=&maxTime=` — shareable, back-button safe | ✅ over cached set; full catalog needs net |
| `/recipes/categories/[category]` · `/recipes/collections/[collection]` (Phase 8) | Category and rule-based collection listings; see `EXPLORE.md`.                                                                                                  | Path params; unknown → 404                                           | ✅ static                                  |
| `/recipes/[slug]`                                                                | Recipe detail: image, times, servings stepper, structured ingredients (by role/group), steps preview, actions: Save, Kitchen Check, Add to list, Start cooking. | `slug`; `?servings=` optional (defaults to `baseServings`)           | ✅ if cached, else fallback                |
| `/recipes/[slug]/check`                                                          | Kitchen Check for one recipe + servings context. Pantry input, readiness report, missing → shopping list CTA, ready → start cooking CTA.                        | `slug`; `?servings=` inherited from detail                           | ✅ fully local                             |
| `/lists`                                                                         | Shopping lists: recipe-derived groups + personal items. Check-off, aggregate view. (Single route; no per-list deep links in MVP.)                               | Filter `?show=open                                                   | done` optional                             | ✅ fully local |
| `/cook/[sessionId]`                                                              | Cooking Mode: step-by-step, contextual quantities, timers, progress, pause/resume, read-aloud, completion. The central experience.                              | `sessionId`; session holds `recipeSlug + servings` snapshot          | ✅ fully local (must never require net)    |
| `/saved`                                                                         | Saved recipes grid. Thin view over saved IDs.                                                                                                                   | None                                                                 | ✅ fully local                             |
| `/offline`                                                                       | Offline fallback for uncached deep links + update prompt.                                                                                                       | None                                                                 | ✅ precached                               |
| `/settings` (provisional)                                                        | Minimal: TTS rate/voice, wake-lock toggle, storage/cache info, about. Only if cheap; otherwise fold into shell menu.                                            | None                                                                 | ✅                                         |

Deliberately absent in MVP: `/account`, `/login`, `/admin`, `/cms/*`, per-user share links, `/recipes/new` (no user-authored recipes). Adding any of these is scope creep — see `TECHNICAL_DECISIONS.md`.

```mermaid
flowchart LR
  Home[/] --> Search[/recipes]
  Home --> Detail[/recipes/slug]
  Search --> Detail
  Detail --> Check[/recipes/slug/check]
  Detail --> Lists[/lists]
  Check --> Lists
  Check --> Cook[/cook/sessionId]
  Detail --> Cook
  Lists --> Cook
  Home --> Saved[/saved]
  Saved --> Detail
  Cook --> Home
```

## 2. Navigation

Mobile (primary):

- Bottom tab bar (max 4): **Home, Search, Lists, Saved**. Cooking Mode is full-screen and hides tabs (interrupt-free). Kitchen Check is a pushed sheet/page with explicit back to detail.
- Persistent **resume banner** on `/` when a non-completed session exists ("Resume Jollof rice — Step 4 of 8"). One tap → `/cook/[sessionId]`.

Tablet/desktop:

- Same routes. Tabs become top nav / sidebar; content max-width with two-column detail (ingredients sticky, steps flowing). Cook mode centers single-step column with sticky timer rail. No route divergence — CSS only.

Global shell elements: install prompt (deferred, non-blocking), "Update available" toast (never auto-reload mid-cook), offline indicator (subtle, cook mode never blocked).

## 3. Page contracts (what each route needs)

### `/` Home

- Needs: featured recipes (cached), resume pointer (`last-session:<recipeId>`), saved preview.
- States: first-run empty (seed suggestions), offline-cached, update-available.
- Never fetches personal data remotely.

### `/recipes` Search

- Needs: cached recipe index (id, slug, title, tags, times, image). Filters are URL params so results are linkable.
- MVP search is substring + tag/time filters over cached set. No server search, no AI ranking.
- Empty states distinguish "no match in cached set — go online for full catalog" from "no match at all."

### `/recipes/[slug]` Detail

- Needs: validated `Recipe` object, `targetServings` (local UI state, reflected in `?servings=`), scaled ingredients via `scaleIngredients()`, saved flag.
- Actions and destinations:
  - Servings stepper → rescales quantities inline (no reload).
  - `Kitchen Check` → `/recipes/[slug]/check?servings=N`.
  - `Add missing/all to list` → writes `shopping_items`, toast + link to `/lists`.
  - `Start cooking` → creates `CookingSession` (frozen servings + quantity snapshot) → redirect `/cook/[sessionId]`.
  - `Save` → toggles saved ID set.
- Ingredient display groups by `group`, badges by `role` (required / optional / substitutable / garnish), substitutes listed verbatim from content.

### `/recipes/[slug]/check` Kitchen Check

- Needs: same scaled ingredients as detail + pantry input (ephemeral, optionally persisted per recipe+servings).
- Output: `ReadinessReport` — ready flag, per-item status, missing lists.
- CTAs: `Add missing to shopping list` (always), `Start cooking` (enabled when `ready`, otherwise shows what's missing; optional/garnish missing never blocks).
- No timers, no step UI here. Single responsibility: readiness.

### `/lists` Shopping lists

- Needs: all `shopping_items` (recipe-origin grouped by recipe + servings context, personal ungrouped).
- Interactions: check/uncheck, edit personal, delete, "clear checked", "clear recipe group". Quantities show servings context ("2 cups rice — for 4 servings").
- No auto-mutation when servings change elsewhere; provenance is display-only history.

### `/cook/[sessionId]` Cooking Mode

- Needs: session snapshot (steps, scaled quantities, timers, progress). Renders synchronously from IndexedDB — no skeleton, no network spinner.
- Layout per step: step position ("Step 4 of 8"), title + body, contextual quantities (only `ingredientRefs` for this step, with scaled values), timer card(s) if `timerSeconds`, controls (Back / Next / Mark done, timer start/pause/reset, read-aloud, pause-cook).
- Progress: linear bar + completed steps; pause persists immediately; resume restores exact step + timer `remaining`.
- Completion: summary (time taken, servings cooked) → actions (back home, view lists, rate later — rating out of MVP).
- Wake lock requested on mount where supported; released on pause/unmount. TTS reads current step on demand; voice commands (if added) map to the same Next/Back/Timer functions as buttons.

### `/saved`, `/offline`, `/settings`

- `saved`: grid of saved recipes from ID set + cached content; unsave inline; empty state links to discovery.
- `offline`: explains what's cached, links to saved/lists/resume; never shown during active cook (cook never redirects away).
- `settings` (if built): TTS rate, wake-lock preference, cache size/clear, app version. No account settings in MVP.

## 4. Data flow per journey stage

```
DISCOVER  (/ , /recipes)      → read cached Recipe index
CHECK     (/recipes/[s]/check)→ scale → pantry input → ReadinessReport
SHOP      (/lists)             → missing → ShoppingItems (snapshot + refs) + personal
COOK      (/cook/[id])         → session snapshot → steps + timers + progress
COMPLETE  (/cook/[id] done)    → status=completed → resume cleared → home
```

State ownership recap (detail in `PRODUCT_ARCHITECTURE.md`):

- URL owns: `slug`, `sessionId`, search/filter params, `servings` intent.
- Local UI state owns: stepper value pre-freeze, pantry checkboxes, timer tick display.
- IndexedDB owns: sessions, shopping items, pantry drafts (optional).
- `localStorage` owns: saved IDs, device ID, resume pointers, prefs.
- Nothing personal lives remotely in MVP.

## 5. Responsiveness and PWA notes

- One codebase, CSS breakpoints: `<640px` single column cook-first; `640–1024px` two-column detail; `>1024px` centered cook column + sticky timer/progress rail.
- Touch targets ≥ 44px in check/cook/lists; cook controls thumb-reachable; no hover-dependent actions.
- PWA: `manifest.ts` (name, icons, display standalone, theme), service worker precaches shell + `/offline`, runtime caches recipe JSON/images. Install prompt deferred until second visit or first save — never during cook.
- Deep links (`/recipes/[slug]`, `/cook/[sessionId]`) resolve offline when cached; uncached → `/offline` with retry. Cook links never require network after session creation.

## 6. What stays out (IA-level non-goals)

Separate mobile/desktop sitemaps, user profiles, social sharing pages, recipe authoring routes, admin/CMS preview routes, AI chat/recommendation surfaces. Each would add routes, states, and caching rules the MVP does not need.
