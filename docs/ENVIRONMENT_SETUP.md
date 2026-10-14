# Kooking — Environment Setup (Phase 5)

## Prerequisites

- Node.js 24+ (`node -v`), npm 11+ (`npm -v`). No other runtimes, services, or accounts needed.

## From zero to running

```
git clone <repo-url> && cd Kooking
npm install --no-audit --no-fund
npm run check     # format + lint + typecheck + tests + build, all must pass
npm run dev       # http://localhost:3000
```

Useful while working: `npx vitest` (watch), `npm run format` (write style).

## Environment variables

**None required.** The app is local-first: no database URL, no API keys, no auth secrets exist in any phase so far. Do not invent credentials or commit placeholder secrets.

When the first real variable arrives (e.g. a CMS endpoint or Supabase URL), follow this convention:

1. Read it in one place with Zod validation at startup (fail fast with an actionable message, never a silent `undefined`).
2. Document it here with purpose and example value shape.
3. Add a `.env.example` containing **placeholder keys only** (e.g. `NEXT_PUBLIC_CMS_URL=https://...`), never real values.
4. Keep `.env*.local` out of git (already ignored via standard Next.js handling; add explicit rules if introduced).
5. Client-exposed variables must use the `NEXT_PUBLIC_` prefix; server secrets must never carry it.

Until then, the absence of `.env` files is correct — not an oversight.
