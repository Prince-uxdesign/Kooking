import demoTomatoRice from "./demo-tomato-rice.json";

/**
 * Raw seed payloads in catalog (editorial) order. Every entry is
 * DEMO content (`demo: true`, status `draft`) — not chef-validated,
 * not tested. Replace with chef-approved JSON; the catalog parses
 * everything through `recipeSchema`, so no code changes are needed.
 */
export const SEED_RECIPES: unknown[] = [demoTomatoRice];
