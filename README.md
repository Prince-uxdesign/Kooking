# Fork

A Nigerian cooking companion: discover recipes, check what you have (Kitchen Check),
build a shopping list, and cook step by step with timers, read-aloud and voice
commands. Local-first: everything works without an account.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # format, lint, typecheck, tests, production build
```

Accounts and cross-device sync are optional and only turn on when Supabase is
configured (copy `.env.example` to `.env.local`). Without it, the app is fully
usable as a guest and the Profile screen says accounts aren't available.

## Layout

| Path                | What lives there                                                        |
| ------------------- | ----------------------------------------------------------------------- |
| `app/`              | Routes only: pages, layouts, `manifest.ts`, `api/ping`, `offline`       |
| `features/<area>/`  | Screens and UI logic per area (recipes, kitchen-check, cooking, saved…) |
| `shared/domain/`    | Pure rules: no React, no storage (scaling, readiness, sessions, timers) |
| `shared/data/`      | Repositories and adapters (localStorage, memory, Supabase)              |
| `shared/ui/`        | Design-system components ("Clean Kitchen": flat, airy, no shadows)      |
| `tests/integration` | Cross-feature journeys (discover → check → cook, offline, edge cases)   |
| `docs/`             | Architecture, design system, accessibility, QA plans                    |

## Rules worth knowing

- Follow `docs/DESIGN_SYSTEM.md`; use only tokens defined in `app/globals.css`.
- Accessibility patterns are in `docs/ACCESSIBILITY.md`; new components get an axe test.
- No AI attribution in commits or docs (see `CLAUDE.md`).
