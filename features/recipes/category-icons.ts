import {
  Banana,
  Bean,
  CalendarDays,
  Clock,
  CookingPot,
  Cookie,
  CupSoda,
  Egg,
  Flame,
  Layers,
  Salad,
  Soup,
  Sparkles,
  UtensilsCrossed,
  Wheat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CollectionRule } from "@/shared/domain/collections";
import type { DiscoveryCategoryId } from "@/shared/domain/discovery";

/** One outline icon per discovery category — presentation only, no meaning implied. */
export const CATEGORY_ICONS: Record<DiscoveryCategoryId, LucideIcon> = {
  rice: Wheat,
  "stews-soups": Soup,
  swallow: UtensilsCrossed,
  breakfast: Egg,
  "beans-legumes": Bean,
  plantain: Banana,
  snacks: Cookie,
  sides: Salad,
  grills: Flame,
  drinks: CupSoda,
  quick: Clock,
};

/** Fallback-photo icon for a recipe: its first category, else a pot. */
export function iconForRecipe(categories: readonly string[]): LucideIcon {
  const first = categories[0] as DiscoveryCategoryId | undefined;
  return (first && CATEGORY_ICONS[first]) || CookingPot;
}

/** Collection icon by what its rule is about, so new collections need no UI change. */
const COLLECTION_RULE_ICONS: Record<CollectionRule["kind"], LucideIcon> = {
  "max-total-minutes": Clock,
  "min-total-minutes": CalendarDays,
  tag: Layers,
  difficulty: Sparkles,
};

export function iconForCollection(rule: CollectionRule): LucideIcon {
  return COLLECTION_RULE_ICONS[rule.kind];
}
