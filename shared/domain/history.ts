import { z } from "zod";
import type { RecipeSummary } from "./discovery";

/**
 * Recently viewed recipes. Device-local, guest-owned, no account.
 * Stores ids only — titles and images always come from the catalog,
 * so removed recipes silently drop out instead of rendering stale.
 */

export const recentViewSchema = z.object({
  recipeId: z.string().min(1).max(100),
  viewedAt: z.number().int().nonnegative(),
});

export type RecentView = z.infer<typeof recentViewSchema>;

export const RECENT_VIEWS_CAP = 12;

/** Most recent first, one entry per recipe, capped. */
export function recordView(
  views: RecentView[],
  recipeId: string,
  now: number,
  cap = RECENT_VIEWS_CAP,
): RecentView[] {
  return [{ recipeId, viewedAt: now }, ...views.filter((v) => v.recipeId !== recipeId)].slice(
    0,
    cap,
  );
}

/** Map history onto the current catalog, newest first, skipping unknown ids. */
export function resolveRecentlyViewed(
  views: RecentView[],
  catalog: RecipeSummary[],
  limit = 4,
): RecipeSummary[] {
  const byId = new Map(catalog.map((r) => [r.id, r]));
  return [...views]
    .sort((a, b) => b.viewedAt - a.viewedAt)
    .flatMap((v) => {
      const hit = byId.get(v.recipeId);
      return hit ? [hit] : [];
    })
    .filter((r, i, all) => all.findIndex((x) => x.id === r.id) === i)
    .slice(0, limit);
}
