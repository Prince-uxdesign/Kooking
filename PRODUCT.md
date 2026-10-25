# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

New cooks making Nigerian food, in Nigeria and in the diaspora: young adults cooking for themselves, flatmates or family, often for the first time or without someone to learn from. They cook from a phone propped on the counter, often with messy hands, sometimes shopping in markets with poor signal.

## Product Purpose

Fork is a step-by-step cooking companion for Nigerian food. A cook picks a recipe, checks what they already have at their serving size (Kitchen Check), gets one shopping list for what's missing, then cooks one step at a time with timers, read-aloud and voice commands. Success is a first-time cook finishing a dish that turns out right, and coming back to cook the next one.

## Positioning

Guidance at the stove, not a recipe library. Every step says what "done" looks like (colour, smell, texture), not just how long to wait; quantities sit on the step that uses them; swaps come only from each recipe's own approved list and are never invented. Recipe videos and blogs assume you already know how to cook; Fork doesn't.

## Operating Context

- Core journey: discover → Kitchen Check → shop → Cooking Mode → done.
- Used on phones in home kitchens; Cooking Mode keeps the screen awake and timers survive reloads and locked screens.
- Shopping lists and cached recipes work offline (installable PWA).
- No account is needed; saved recipes, lists and sessions live on the device until the cook chooses to sync.

## Capabilities and Constraints

- Next.js web app, local-first; Supabase accounts and sync are optional and off unless configured.
- 14 real Nigerian recipes (jollof rice, egusi soup, efo riro, moi moi and others), all currently `in_review`: compiled from published home-cooking recipes and awaiting a Fork kitchen test. Never describe them as chef-tested.
- Servings scale through the real engine (`shared/domain/scaling`, `units`); timers do not scale.
- Open: production domain (metadata still falls back to `kooking.app`).

## Brand Commitments

- Name: Fork (renamed from Kooking; internal storage keys keep `kooking:*` on purpose).
- Logo: a map pin with a fork cut through it (`shared/ui/Logo.tsx`), lowercase "fork" wordmark.
- Voice: plain, warm, specific to Nigerian kitchens (ata rodo, tatashe, ugu, crayfish); no AI or hype language.
- The user has approved the current landing page design (Gloock hero, Host Grotesk text, pepper orange); refinements must preserve it.

## Evidence on Hand

- Recipe photographs and step photographs in `public/images/recipes/` (Wikimedia Commons, credited in `content/image-credits.json`).
- Unsplash lifestyle and dish photos on the landing page (no attribution required; the user does not want them credited on the page).
- No ratings, user counts, press, customer logos or real reviews exist. Stories and testimonials on the landing page are labelled illustrative composites and must stay labelled until real, consented reviews exist.

## Product Principles

1. Tell the cook what done looks like, not just how long.
2. Never invent: no fabricated swaps, reviews, numbers or "tested" claims.
3. Works where cooking happens: one hand, no signal, screen awake.
4. No sign-up wall between someone and their first dish.

## Accessibility & Inclusion

WCAG 2.2 AA (`docs/ACCESSIBILITY.md`); every new component gets an axe test; every voice command has a touch alternative; motion respects reduced-motion.
