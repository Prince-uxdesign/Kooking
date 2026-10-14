import { DISCOVERY_CATEGORIES } from "@/shared/domain/discovery";
import { Chip } from "@/shared/ui/Chip";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { CATEGORY_ICONS } from "@/features/recipes/category-icons";

/**
 * Discovery entry points into Explore: category pages plus the Quick
 * meals collection.
 * Flat gray chips: one swipeable row on phones (bleeds to the screen
 * edge), wrapping freely from 640px.
 */
export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
      <SectionHeading id="categories-heading" title="Categories" />
      <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {DISCOVERY_CATEGORIES.map(({ id, label, href }) => {
          const Icon = CATEGORY_ICONS[id];
          return (
            <li key={id} className="shrink-0">
              <Chip href={href} icon={<Icon size={18} strokeWidth={1.75} />}>
                {label}
              </Chip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
