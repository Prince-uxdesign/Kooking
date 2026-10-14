"use client";

import { memo } from "react";
import { Check, HelpCircle, Pencil } from "lucide-react";
import type { ItemGroup, ShoppingItem } from "@/shared/domain/shopping";
import { formatQuantity, type Unit } from "@/shared/domain/units";

const fmt = (qty: number | null, unit: string | null) => formatQuantity(qty, unit as Unit | null);

function toBuyLabel(item: ShoppingItem): string {
  if (item.needsClarification) return "Amount to check";
  if (item.qty === null) return item.origin === "recipe" ? "As needed" : "";
  return fmt(item.qty, item.unit);
}

/** Context line: what the recipe needs vs what the cook had. Only shown when known. */
function contextLine(item: ShoppingItem): string | null {
  if (item.origin !== "recipe" || item.requiredQty == null) return null;
  const unit = item.unit;
  const need = `Recipe needs ${fmt(item.requiredQty, unit)}`;
  if (item.availableQty == null || item.needsClarification) return need;
  return `${need} · you have ${fmt(item.availableQty, unit)}`;
}

function groupNote(group: ItemGroup | undefined, item: ShoppingItem): string | null {
  if (!group) return null;
  const others = group.items.filter((i) => i.id !== item.id && !i.checked);
  if (others.length === 0) return null;
  const n = others.length;
  const lead = `Also on your list ${n === 1 ? "once more" : `${n} more times`}`;
  if (group.total !== null && group.totalUnit !== null && !group.incompatible) {
    return `${lead}. Total to buy: ${fmt(group.total, group.totalUnit)}.`;
  }
  return `${lead}, in amounts that can't be added together.`;
}

/**
 * One shopping row. The whole row is the tap target for the checkbox
 * (56px+). Ticking means "bought"; it never changes Kitchen Check.
 */
export const ShoppingItemRow = memo(function ShoppingItemRow({
  item,
  group,
  onToggle,
  onEdit,
  showRecipe = false,
}: {
  item: ShoppingItem;
  group?: ItemGroup;
  onToggle: () => void;
  /** Opens the editor. Omitted = read-only row. */
  onEdit?: () => void;
  /** Show which recipe the item came from (lists mixing recipes and personal items). */
  showRecipe?: boolean;
}) {
  const context = contextLine(item);
  const note = groupNote(group, item);
  const toBuy = toBuyLabel(item);
  const recipeTag =
    showRecipe && item.origin === "recipe" && (item.recipeTitle || item.recipeSlug)
      ? `For ${item.recipeTitle ?? item.recipeSlug}${item.servingsContext ? ` · ${item.servingsContext} servings` : ""}`
      : null;

  return (
    <li
      className={`flex list-none items-start gap-1 rounded-[20px] pr-2 transition-colors ${
        item.checked ? "bg-primary-100" : "bg-surface-100 hover:bg-surface-200"
      }`}
    >
      <label className="flex min-h-[64px] min-w-0 flex-1 cursor-pointer items-start gap-4 py-4 pl-4 pr-2">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={onToggle}
          aria-label={`${item.name}${toBuy ? `, ${toBuy}` : ""}`}
          className="mt-0.5 h-6 w-6 shrink-0 accent-[#111311]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={`min-w-0 break-words text-[1rem] leading-6 ${
                item.checked ? "text-ink-500 line-through" : "text-ink-900"
              }`}
            >
              {item.name}
            </span>
            <span
              className={`tnum shrink-0 text-right text-[1rem] font-semibold leading-6 ${
                item.needsClarification ? "text-info-700" : "text-ink-900"
              }`}
            >
              {toBuy}
            </span>
          </span>
          {recipeTag && (
            <span className="text-[0.8125rem] leading-5 text-ink-500">{recipeTag}</span>
          )}
          {context && (
            <span className="tnum text-[0.8125rem] leading-5 text-ink-500">{context}</span>
          )}
          {item.needsClarification && item.clarification && (
            <span className="inline-flex items-start gap-1.5 text-[0.8125rem] leading-5 text-info-700">
              <HelpCircle aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {item.clarification}
            </span>
          )}
          {note && <span className="text-[0.8125rem] leading-5 text-ink-500">{note}</span>}
          {item.notes && (
            <span className="break-words text-[0.8125rem] leading-5 text-ink-700">
              {item.notes}
            </span>
          )}
          {item.checked && (
            <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-success-700">
              <Check aria-hidden size={14} strokeWidth={2.5} />
              Bought
            </span>
          )}
        </span>
      </label>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
          title={`Edit ${item.name}`}
          className="mt-2 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink-900 hover:bg-surface-50"
        >
          <Pencil aria-hidden size={18} strokeWidth={1.75} />
        </button>
      )}
    </li>
  );
});
