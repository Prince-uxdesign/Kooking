# Fork — Technical Decisions (Phase 1)

Status: **Proposed — for review.** Distinguishes final, provisional, and out-of-MVP decisions. No dependencies installed in this phase.

## 0. Phase 0 baseline

Empty local folder and empty GitHub remote, no commits, no stack. All choices below are greenfield recommendations constrained by: mobile-first PWA, offline resilience, local-first MVP, Nigerian chef-validated content arriving later, no AI recipes in MVP.

## 1. Final decisions (hold unless review overturns)

| Decision                 | Choice                                                                                 | Why it fits Fork                                                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                | **Next.js (App Router) + React + TypeScript**                                          | One responsive PWA for mobile/tablet/desktop; Server Components for discovery/detail, Client Components for check/cook/lists interactivity; file-based routes match IA directly; Vercel deploy is trivial when needed. |
| Language strictness      | **TypeScript strict, schema-validated content**                                        | Recipe scaling, readiness rules, and session persistence are correctness-critical. Types + runtime schema (Zod recommended) catch bad content at the boundary, not mid-cook.                                           |
| Styling                  | **Tailwind CSS (or equivalent utility system)**                                        | Mobile-first responsive with one codebase, fast iteration on cook/check touch UI, no design-system package to maintain in MVP. Exact version pinned at scaffold time.                                                  |
| Business-logic placement | **Pure `shared/domain`, no React/storage I/O**                                         | Scaling, readiness, list derivation, session transitions are unit-testable and reusable across detail/check/shop/cook. Prevents duplicated math in components.                                                         |
| Data-access seam         | **Repository interfaces + local adapters**                                             | Components never touch storage/network. Swapping static JSON → CMS fetch → Supabase later changes adapters only.                                                                                                       |
| Local persistence        | **`localStorage` (small prefs/flags) + IndexedDB (sessions, lists)**                   | Sessions and lists must survive reload and exceed `localStorage` comfort; resume pointers stay in `localStorage` for synchronous shell reads. No backend needed for MVP.                                               |
| Recipe content shape     | **Closed TypeScript + Zod schema (§4 of Product Architecture)**                        | `required/optional/substitutable/garnish` roles, `scalable` flags, fixed `substitutes` lists, invariant timers. Enforces "no AI recipes / no free-form substitutions" at the data layer.                               |
| Servings math            | **Linear factor, unit-class rounding, timers invariant**                               | Predictable, chef-reviewable, explainable. No hidden heuristics.                                                                                                                                                       |
| Session model            | **`endsAt + remaining` timers, snapshot quantities, one resumable session per recipe** | Reload-safe, background-throttle tolerant, no mid-cook mutation surprises.                                                                                                                                             |
| Shopping model           | **Single store, `origin: recipe \| personal`, snapshot quantities + provenance**       | One list UX, no sync conflicts from auto-mutation, personal items independent.                                                                                                                                         |
| Guest-first              | **No auth wall; local `deviceId`; remote sync is later merge, never prerequisite**     | Matches "optional accounts" requirement; cooking works with zero network or login.                                                                                                                                     |
| Offline                  | **PWA shell precache + versioned content cache + `/offline` fallback**                 | Cooking, lists, check, and cached recipes work offline as a product promise.                                                                                                                                           |
| Voice                    | **`SpeechPort` abstraction; MVP ships read-aloud only**                                | Touch parity always; provider swap (browser → other) never touches cook UI.                                                                                                                                            |
| Error handling           | **Schema-fail-closed + tiered UI errors + route boundaries**                           | Bad content never half-renders; cook progress never depends on network.                                                                                                                                                |

## 2. Provisional decisions (to confirm at scaffold / Phase 2)

| Area                  | Current recommendation                                                  | What would change it                                                                                                             |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Schema library        | **Zod**                                                                 | If Next.js scaffold standardizes otherwise, or bundle weight forces lighter validation — but schema-at-boundary itself is final. |
| State library         | **None yet (`useState`/`useReducer` + repos)**                          | Add Zustand (or Context slice) only if cook/check/shop prop-drilling proves painful. No preemptive store.                        |
| Data fetching/caching | **Native `fetch` + Server Components + service worker; no React Query** | Add TanStack Query only when CMS pagination/search invalidation justifies it.                                                    |
| PWA implementation    | **Serwist / `next-pwa` successor, `manifest.ts`**                       | Confirm maintenance status at scaffold time; requirement (installable + offline) is final, library choice is not.                |
| Storage wrapper       | **Thin wrapper over `idb-keyval` (or direct IndexedDB)**                | Confirm at scaffold; avoid pulling Dexie/large ORM for MVP payloads.                                                             |
| Image handling        | **`next/image` + static/remote allowlist**                              | Chef image pipeline (later) may dictate CMS loader config.                                                                       |
| TTS/Listening impl    | **System `speechSynthesis` for read-aloud; recognition deferred**       | Recognition only for `next/back/repeat/timer` intents, after MVP cook is stable and permission UX is designed.                   |
| `/settings` route     | **Fold into shell menu unless prefs demand a page**                     | Build the route only if TTS/wake/cache controls exceed menu space.                                                               |

## 3. Integrations needed later (reserve seam, do not install)

- **Supabase + PostgreSQL + Auth**: for optional accounts, saved/list backup, and completed-session summaries. Trigger: real multi-device or backup demand — not MVP. When added, sits behind existing repository interfaces; personal data migrates by ID merge.
- **Recipe CMS workflow**: chef drafts → CI schema validation → versioned content API. Trigger: chef partner content ready. App-side change is a new `shared/data` adapter + `contentVersion` handling already specified — no feature rewrites.
- **Deployment (Vercel)**: appropriate when scaffolding lands, not an architecture risk now.
- **Limited voice commands**: `next/back/repeat/timer` intents via `SpeechPort.listen`. Trigger: stable cook mode + tested permission fallback. Free-form voice and AI substitution stay out.
- **Wake Lock API**: use where supported with silent degrade; no polyfill complexity.

Explicitly not planned: analytics suites, error-tracking vendors, push-notification infra, background-sync servers, unit-conversion services, AI recipe/substitution endpoints. Each would add dependencies, permissions, or offline failure modes the MVP must not carry.

## 4. Features outside the MVP (do not architect for)

AI-generated recipes, unrestricted/free-text AI substitutions, user-authored recipes, social/sharing graphs, ratings/reviews backend, пере- (cross-)unit conversion engine, server-side timers, multi-device live session sync, admin/CMS UI in-repo. Mentioning them here is a guardrail: PRs introducing them during MVP phases must update these docs and justify scope change.

## 5. Trade-offs accepted

1. **Local-first over cloud-first**: gains offline cooking + zero-auth simplicity; costs later migration work (ID merge, conflict rules). Accepted because cooking must never fail on network or login.
2. **Closed recipe schema over flexible content**: gains safety (validated instructions, fixed substitutes) and simple rules; costs chef-authoring rigidity. Accepted — content quality is the product, and flexibility is deferred to CMS phase with the same schema.
3. **Snapshot quantities over live-linked lists/sessions**: gains predictability (mid-shop/mid-cook values never shift); costs manual re-add when servings change. Accepted as less surprising than silent mutation.
4. **Same-unit compare over conversion engine**: gains simplicity and fewer wrong answers; costs boolean fallback for mismatched units. Accepted for MVP; conversion is a content task with the chef, not a library to guess.
5. **No state/data libraries yet**: gains smaller bundle and fewer abstractions; costs some boilerplate if the app grows. Accepted — seams (`domain`, repositories, `SpeechPort`) make later additions cheap.
6. **One responsive PWA over native/hybrid**: gains single codebase + installability + offline; costs reduced background-timer precision and fragmented speech/wake support. Mitigated with `endsAt` math, capability probes, and touch parity.

## 6. What Phase 2 may implement (and what it may not)

May (only after this architecture is approved): Next.js + TS + styling scaffold matching §16 directory structure in `PRODUCT_ARCHITECTURE.md`; recipe schema + domain pure functions with unit tests; seed fixture content (hand-written, clearly marked non-chef sample); repository interfaces + local adapters; route shells per `INFORMATION_ARCHITECTURE.md` without full UI polish.

May not: full home/recipe UI build-out, CMS integration, Supabase/auth wiring, voice-command listening, analytics, or any out-of-MVP feature above. Phase 2 proposal must map each task back to these docs.

## 7. Architectural risks (recap)

Timer throttling on lock/background, speech/wake fragmentation, cache staleness vs. `contentVersion`, servings-rounding trust, and scope creep into CMS/auth/AI. Mitigations are specified in `PRODUCT_ARCHITECTURE.md` §17. Highest near-term risk is scope creep, controlled by the final/provisional/out-of-MVP split above.
