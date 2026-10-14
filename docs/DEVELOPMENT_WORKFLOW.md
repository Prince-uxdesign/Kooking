# Kooking — Development Workflow (Phase 0)

How work gets done in this repo, end to end. Commands verified; see ENVIRONMENT_SETUP for prerequisites.

## 1. Daily loop

```
npm run dev          # build the feature on a short-lived branch
npm test             # fast feedback while working (or npx vitest to watch)
npm run check        # the gate: format + lint + typecheck + tests + build
```

`npm run check` must be green before review. It runs, in order: `format:check`, `lint`, `typecheck`, `test`, `build`. Fix the first failure; do not skip ahead.

## 2. Branching and commits (solo → team)

- Solo (now): work on `main` in small commits, one concern each — e.g. `feat(shopping): derive missing items`, `test(domain): readiness shortfalls`, `docs: ...`.
- Team (later): short-lived `feat/<topic>` branches, squash-merge after `npm run check` + one review. Never rewrite published history, never force-push, never `reset --hard`.
- Suggested first history for the current uncommitted work: `phase 1 architecture docs` → `phase 2 design system` → `phase 3 app shell` → `phase 4 data architecture` → `phase 5 quality gates` → `phase 0 audit`. Review, then push `main` to `origin`.

## 3. Definition of done (every change)

1. `npm run check` green (claim nothing otherwise).
2. New rules carry tests; touched behavior keeps old tests passing.
3. Responsive QA checklist run for anything visual (`docs/RESPONSIVE_QA_CHECKLIST.md`).
4. No secrets added; no unjustified dependency (record the reason in the relevant doc).
5. Docs updated if contracts changed (routes, schemas, tokens, gates).

## 4. Reviews

Reviewer runs `npm run check` locally, reads the diff (not just the description), and checks: layering intact (UI → feature → domain → data), validation at boundaries, placeholders honest, no fake content or credentials. Approval requires a green gate, not just green CI — there is no CI yet (acceptable; add when the first push lands).

## 5. Releases

No deploy target configured. When one is needed, Vercel is the reserved choice (see TECHNICAL_DECISIONS); deployment then becomes `git push` + the same `npm run check` gate. No manual build artifacts are ever committed.
