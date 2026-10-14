import { z } from "zod";
import type { RecipeSummary } from "./discovery";
import { recipeDifficulties, type Recipe } from "./recipe-schema";

/**
 * Curated collections are rules over recipe data, not lists of recipe
 * ids — membership is derived, so recipes are never duplicated and a
 * collection can only claim what the content actually says. New
 * collections are a content change (`content/collections.json`).
 */

const tagSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9-]+$/);

const minutesSchema = z.number().int().min(1).max(2880);

export const collectionRuleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("max-total-minutes"), minutes: minutesSchema }),
  z.object({ kind: z.literal("min-total-minutes"), minutes: minutesSchema }),
  z.object({ kind: z.literal("tag"), tag: tagSchema }),
  z.object({ kind: z.literal("difficulty"), difficulty: z.enum(recipeDifficulties) }),
]);

export type CollectionRule = z.infer<typeof collectionRuleSchema>;

export const collectionSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  rule: collectionRuleSchema,
});

export type Collection = z.infer<typeof collectionSchema>;

export const collectionsSchema = z.array(collectionSchema).superRefine((list, ctx) => {
  const slugs = list.map((c) => c.slug);
  if (new Set(slugs).size !== slugs.length) {
    ctx.addIssue({ code: "custom", message: "collection slugs must be unique" });
  }
});

export function matchesRule(recipe: Recipe, rule: CollectionRule): boolean {
  switch (rule.kind) {
    case "max-total-minutes":
      // Zero means "not recorded" — never counts as quick.
      return recipe.timeMinutes.total > 0 && recipe.timeMinutes.total <= rule.minutes;
    case "min-total-minutes":
      return recipe.timeMinutes.total >= rule.minutes;
    case "tag":
      return recipe.tags.includes(rule.tag);
    case "difficulty":
      return recipe.difficulty === rule.difficulty;
  }
}

/** Members in catalog order. Callers pass listable recipes only. */
export function recipesInCollection(recipes: Recipe[], collection: Collection): Recipe[] {
  return recipes.filter((r) => matchesRule(r, collection.rule));
}

export function collectionHref(slug: string): string {
  return `/recipes/collections/${slug}`;
}

export interface CollectionOverview {
  collection: Collection;
  count: number;
  /** First member — its photo (or fallback) fronts the collection. */
  cover: RecipeSummary;
}

/**
 * Collections worth showing on Explore: those with at least
 * `minRecipes` members. Empty collections stay reachable by URL
 * (with an empty state) but are never advertised.
 */
export function visibleCollections(
  collections: Collection[],
  recipes: Recipe[],
  toSummary: (recipe: Recipe) => RecipeSummary,
  minRecipes = 1,
): CollectionOverview[] {
  return collections.flatMap((collection) => {
    const members = recipesInCollection(recipes, collection);
    return members.length >= Math.max(1, minRecipes)
      ? [{ collection, count: members.length, cover: toSummary(members[0]) }]
      : [];
  });
}
