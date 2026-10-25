# Fork — Application Shell & Navigation (Phases 3 + 6)

Status: **Implemented and verified.** Layout + navigation + deliberate placeholders. No feature modules (discovery, check, lists, cook) built.

## 1. Structure

Two route groups under a chrome-free root layout:

```
app/layout.tsx                 html/body, metadata, skip link — no nav
app/(main)/layout.tsx          AppShell for tabbed destinations
app/(main)/page.tsx            Home (Phase 7 — see HOME_SCREEN.md)
app/(main)/recipes/[slug]      Recipe detail stub (records Recently viewed)
app/(main)/recipes/page.tsx    Explore (Phase 8 — see EXPLORE.md); categories/[category], collections/[collection]
app/(main)/saved/page.tsx      Saved (placeholder)
app/(main)/lists/page.tsx      Shopping List (placeholder)
app/(main)/profile/page.tsx    Profile (placeholder, accounts optional/later)
app/(focused)/layout.tsx       Immersive dark chrome: brand + Exit only
app/(focused)/cook/[sessionId] Focused-mode boundary stub — not Cooking Mode
app/design-system/page.tsx     Outside the shell (standalone reference)
app/not-found.tsx · error.tsx · loading.tsx
shared/shell/                  nav-items.ts, AppShell, SiteHeader, Navigation, PageHeader, PlaceholderPage
```

## 2. Navigation (single source)

`shared/shell/nav-items.ts` exports `NAV_ITEMS` (Home, Explore, Saved, Shopping List, Profile) with hrefs, full + compact labels, icons, and match rules, plus pure `isNavActive()`. Tab bar and sidebar both render from it — no duplicated lists. Path mapping: Explore → `/recipes`, Shopping List → `/lists`, matching `INFORMATION_ARCHITECTURE.md`; `/profile` is new (Phase 3 brief) and stays a placeholder until accounts earn their place.

## 3. Responsive decisions

- **< lg (phones and tablets):** plain white header (brand only, not sticky) + a floating dark pill tab bar centered 16px above the bottom. Five 48px circular tabs; the active tab turns green and shows its compact label (from 360px). Inactive tabs are icon-only on screen, with the full name as `aria-label` and `title`. See DESIGN_SYSTEM.md §5.
- **>= lg (desktop):** sticky white left sidebar (264px, brand + full-label pill links, active = green fill + local-first note); top header hidden. No cramped five-item mobile header anywhere.
- **Containers:** max 1120px main (720px focused), gutters 20 / 24 / 48px, tab-bar clearance `pb-32` on touch layouts.
- **Safe areas:** `.safe-top` / `.safe-bottom` apply `env(safe-area-inset-*)` to sticky chrome.
- Shell links are anchors with `aria-current="page"`; the button-style `NavItem` primitive remains for in-page actions only (link vs. button semantics kept honest).

## 4. Cooking boundary

`(focused)` group proves the immersive convention Cooking Mode will use: dark low-glare surface, narrow column, brand + Exit header, zero tab/sidebar chrome. The `/cook/[sessionId]` stub renders session context and an exit — step UI, timers, and progress arrive in a later phase.

## 5. Placeholders, loading, errors

Unbuilt destinations render `PlaceholderPage` (PageHeader + EmptyState + Back to Home) — deliberate, no fake content, no dead links. Global `loading.tsx` (status announced), `error.tsx` (alert + retry via `reset`), `not-found.tsx` (recovery to Home). Cook stubs never redirect away mid-flow.

## 6. Accessibility

Skip link (visible on focus) → `#main-content` in every layout; semantic `header`/`nav`/`main`; active route exposed via `aria-current`; floating tabs: active tab shows icon + label, inactive tabs are icon-only on screen but always carry their full name (`aria-label` + `title`). This trade-off follows the visual direction the user chose; revisit if testing shows tabs are hard to recognise. 48px targets throughout; visible 3px focus ring; reduced-motion and tabular-numeral rules inherited from Phase 2. All navigation uses default link (push) semantics, so browser back/forward history works natively; no `replace` navigation anywhere.

## 7. Trade-offs

Floating pill tabs are kept on tablet for thumb reach and consistency; the sidebar appears only at `lg`, where labels have room. Header carries brand alone — search and actions belong to pages, not chrome. No global state: active route derives from `usePathname`; no new dependencies.
