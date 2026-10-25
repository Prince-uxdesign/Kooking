# Fork — Quality Standards (Phase 5)

Applies from this phase on. Tooling is minimal on purpose: prettier, eslint (JS), `tsc`, vitest, `next build`. Nothing added without a check behind it.

## 1. Type safety (`tsconfig.json`, strict)

- No `any`. No `@ts-ignore`. No non-null assertions (`!`) — restructure instead (e.g. `flatMap` over optional values rather than `filter` + `!`, as done in `session.ts`).
- `as const` is allowed for literal narrowing only. No `as unknown` round-trips.
- Domain types are inferred from Zod schemas (`z.infer`), defined once in `shared/domain/`. UI consumes them via `import type` (erased at compile, zero bundle cost) — no parallel hand-written copies (see `IngredientRow`, which imports `IngredientRole` from the schema).
- Data boundaries stay weakly-typed on the way in (`unknown` → `schema.parse`), strongly-typed after. Never trust a payload because TypeScript says so — validate, then type.
- Validation failures are values, not crashes: `parse` at load time with fallback to empty state; `safeParse` where the UI must explain the problem. Never swallow a failure silently.

## 2. Validation conventions

| Input                | Rule location                                | Failure mode                                          |
| -------------------- | -------------------------------------------- | ----------------------------------------------------- |
| Recipe/seed/CMS JSON | `shared/domain/recipe-schema.ts`             | Fail closed: hide card, log in dev, never half-render |
| Serving counts       | `clampServings` (1–12)                       | Clamp, never throw                                    |
| Kitchen inputs       | `pantryInputSchema`                          | Field-level message, blocking lines listed            |
| Shopping edits       | `shoppingItemSchema` on create               | Reject empty names/zero qty with actionable text      |
| Session payloads     | `cookingSessionSchema` in `rehydrateSession` | Corrupt → start fresh, keep user informed             |
| Storage reads        | Schema re-parse in `shared/data/local.ts`    | Corrupt → drop key, fall back to empty                |

## 3. Error handling

- Expected failures (validation, not-found, storage-full) use typed results: `StoreError` with codes `not-found | unavailable | invalid | conflict`. Callers map codes to UI, never to stack traces.
- Unexpected errors surface through route boundaries (`app/error.tsx` + retry, `app/not-found.tsx` + recovery). Cook progress never depends on a network promise.
- User-facing copy is clear and actionable ("Check your connection and retry. Your progress is kept on this device."). Never expose secrets, stack traces, digests, or internal paths.
- Persistence failures degrade to in-memory state for the session with a notice — the kitchen never hard-blocks.

## 4. Logging

- Development: `console.warn/error` sparingly for content failures (invalid recipe payloads) — enough to catch bad seed/CMS data.
- Production: no verbose logging, no analytics calls in MVP. Never log secrets, tokens, or personal data (there is none in MVP by design).
- The repo currently contains zero logging calls; that is the baseline, not an omission.

## 5. Purity and state

- `shared/domain` stays pure: same input → same output, no `Date.now()`, no storage, no network. Time is always an injected `now` parameter (see session/shopping functions) so tests use fixed clocks.
- No global stores. Route state from URL, UI state from hooks, persisted state from repositories.

## 6. Git workflow

- State of the repo: everything uncommitted on `main`, no history rewrites ever. Never `reset --hard`, never force-push, never `stash drop` someone else's work.
- Commit per verified phase/step, small and reviewable: `docs: phase 5 quality gates`, `feat(recipes): ...`, `test(domain): ...`. One concern per commit; commands from §7 green before committing.
- Suggested first history (run once, in this order, after review):
  `phase 1 architecture docs` → `phase 2 design system` → `phase 3 app shell` → `phase 4 data architecture` → `phase 5 quality gates`. Never commit secrets (there are none; see `ENVIRONMENT_SETUP.md`).

## 7. Commands (verified in this repo)

```
npm run format        # write canonical style
npm run format:check  # CI gate for style
npm run lint          # eslint: typescript-eslint recommended + react-hooks (0 warnings allowed)
npm run typecheck     # tsc --noEmit incl. tests; noUnusedLocals/Parameters are errors
npm test              # vitest run: unit, domain, component (jsdom + axe) and tests/integration
npm run build         # production build + route validation
npm run check         # all of the above, in order
npm run dev           # local dev server
```
