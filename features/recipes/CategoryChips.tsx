import { LayoutGrid } from "lucide-react";
import { CATEGORIES, categoryHref } from "@/shared/domain/categories";
import type { RecipeCategory } from "@/shared/domain/recipe-schema";
import { Chip } from "@/shared/ui/Chip";
import { CATEGORY_ICONS } from "./category-icons";
import { ChipRow } from "./ChipRow";

/**
 * Every category as a chip. On a category page the current one is
 * selected and "All recipes" returns to Explore — switching categories
 * swaps the listing in place.
 */
export function CategoryChips({ current }: { current?: RecipeCategory }) {
  return (
    <ChipRow label="Recipe categories">
      {current && (
        <li className="shrink-0">
          <Chip href="/recipes" icon={<LayoutGrid size={18} strokeWidth={1.75} />}>
            All recipes
          </Chip>
        </li>
      )}
      {CATEGORIES.map(({ id, label }) => {
        const Icon = CATEGORY_ICONS[id];
        return (
          <li key={id} className="shrink-0">
            <Chip
              href={categoryHref(id)}
              selected={id === current}
              icon={<Icon size={18} strokeWidth={1.75} />}
            >
              {label}
            </Chip>
          </li>
        );
      })}
    </ChipRow>
  );
}
