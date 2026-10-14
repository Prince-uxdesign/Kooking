# Kooking — Recipe Content Model (Phase 4)

Status: **Implemented and validated.** Schema: `shared/domain/recipe-schema.ts`. Seed: `content/seed/demo-tomato-rice.json` (explicitly demo, trivially replaceable).

## 1. What a recipe is

A single validated JSON object: identity (id, slug, title), optional photo (`image: { src, alt }` — site path or https, alt text required), classification (1–3 of 10 categories incl. swallow, beans-legumes, plantain; ≤10 lowercase tags; optional content-assigned `difficulty` easy/medium/challenging), slug (never `categories`/`collections` — reserved Explore paths), servings base, honest time math, ≥1 ingredient lines, ≥1 ordered steps, `contentVersion`, lifecycle status, and provenance flags (`demo`, `testedBy?`). Recipes are immutable inputs — sessions, checks, and lists derive snapshots; nothing writes back into a recipe.

## 2. Ingredient lines

Each line: catalog reference + quantity/unit + preparation ("chopped") + role + scaling behavior + optional note + optional closed substitutes list. Roles: `required` (blocks readiness), `substitutable` (blocks until confirmed swap), `optional`/`garnish` (never block). Scaling: `linear`, `discrete`, `approximate`, `to-taste`, `manual` — not everything scales, and the schema enforces the distinction (see `docs/DATA_MODEL.md` §4).

## 3. Steps

Ordered 1..n contiguously, each with instruction, line references, and optional: preparation notes, heat (`low … high`, descriptive — no invented precision), `estimatedMinutes` guidance, **one** timer config (duration + label) only where timing matters, sensory cue ("oil gathers at the edges"), completion note. Most steps have no timer — instructions are not timer events, and durations never scale with servings.

## 4. Status lifecycle and honesty rules

`draft → in_review → tested → approved → published` (returns to `in_review` allowed; skipping forbidden via `canTransition`). `tested/approved/published` require `testedBy`. UI may claim testing **only** when `isChefTested(status)` is true. Demo fixtures carry `demo: true`, stay in `draft`, and are rejected from `published` by validation — the app cannot imply chef testing it doesn't have.

## 5. Replacing demo content

Seeds are registered in catalog order in `content/seed/index.ts` and loaded by `shared/data/catalog.ts`. Delete `content/seed/demo-tomato-rice.json` (and any `demo: true` payloads) and supply chef-validated JSON through the same `recipeSchema.parse()` boundary — same shape, plus `testedBy` and status progression. No code changes needed; the CMS adapter later targets this exact seam. Never invent chef names, endorsements, or "authentic" badges in content or UI.

## 6. Collections

Curated collections are rules over recipe data in `content/collections.json` (`max-total-minutes`, `min-total-minutes`, `tag`, `difficulty`), never lists of recipe ids. Tagging a recipe `one-pot` or `everyday`, or setting `difficulty: "easy"`, is how content joins those collections. See `docs/EXPLORE.md`.
