export default [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts"],
  },
  {
    // JS-only lint. TypeScript correctness is covered by
    // `npm run typecheck` and the Next.js build. Full TS/Next lint
    // rules are deferred to avoid extra deps in this phase.
    files: ["**/*.mjs"],
  },
];
