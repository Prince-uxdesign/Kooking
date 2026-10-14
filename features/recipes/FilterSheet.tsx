"use client";

import type { Facets, FacetOption, FilterKey } from "@/shared/domain/search";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { buttonClasses } from "@/shared/ui/Button";
import { ChipButton } from "@/shared/ui/Chip";
import { recipeCountLabel } from "@/shared/domain/categories";

const SECTIONS: { key: FilterKey; title: string; hint?: string }[] = [
  { key: "category", title: "Category" },
  { key: "maxTime", title: "Total time", hint: "Prep and cooking together. Pick one." },
  { key: "difficulty", title: "Difficulty" },
  { key: "tag", title: "Tags" },
];

/**
 * Filter sheet. Every option shown is backed by catalog data and
 * carries a live count; changes apply immediately (results update
 * behind the sheet), so "Show N recipes" just closes it.
 */
export function FilterSheet({
  open,
  onClose,
  facets,
  onToggle,
  onClearAll,
  activeCount,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  facets: Facets | null;
  onToggle: (key: FilterKey, value: string) => void;
  onClearAll: () => void;
  activeCount: number;
  resultCount: number;
}) {
  return (
    <BottomSheet
      title="Filters"
      open={open}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className={buttonClasses({ variant: "secondary" })}
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className={buttonClasses({ className: "flex-1" })}
          >
            {resultCount === 0 ? "No recipes match" : `Show ${recipeCountLabel(resultCount)}`}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        {facets &&
          SECTIONS.filter(({ key }) => facets[key].length > 0).map(({ key, title, hint }) => (
            <fieldset key={key} className="flex flex-col gap-3">
              <legend className="mb-3 text-[17px] font-semibold text-ink-900">{title}</legend>
              {hint && <p className="-mt-2 text-[13px] leading-5 text-ink-500">{hint}</p>}
              <div className="flex flex-wrap gap-2">
                {facets[key].map((option) => (
                  <FacetChip
                    key={option.value}
                    option={option}
                    onToggle={() => onToggle(key, option.value)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
      </div>
    </BottomSheet>
  );
}

function FacetChip({ option, onToggle }: { option: FacetOption; onToggle: () => void }) {
  return (
    <ChipButton
      pressed={option.selected}
      onClick={onToggle}
      disabled={option.count === 0 && !option.selected}
      label={`${option.label}, ${option.count === 0 ? "no matches" : recipeCountLabel(option.count)}`}
    >
      {option.label}
      <span className="tnum text-[13px] text-ink-600">{option.count}</span>
    </ChipButton>
  );
}
