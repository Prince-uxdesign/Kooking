"use client";

import { useId } from "react";
import {
  CATEGORY_LABEL,
  SHOPPING_CATEGORIES,
  type DraftErrors,
  type ItemDraft,
} from "@/shared/domain/shopping";
import { UNITS } from "@/shared/domain/units";
import { fieldClasses } from "@/shared/ui/TextInput";

function Field({
  id,
  label,
  error,
  children,
  className = "",
  optional = false,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /** Said in the label itself (a placeholder disappears once the cook types). */
  optional?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
        {label}
        {optional && <span className="font-normal text-ink-500"> (optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] font-medium text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}

const described = (id: string, error?: string) => (error ? `${id}-error` : undefined);

/**
 * Quantity, unit, note and aisle fields shared by the add form and the
 * editor. Name lives with the caller so quick-add can keep it inline.
 */
export function ItemDetailFields({
  draft,
  errors,
  onChange,
  idPrefix,
}: {
  draft: ItemDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<ItemDraft>) => void;
  idPrefix?: string;
}) {
  const auto = useId();
  const p = idPrefix ?? auto;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Field id={`${p}-qty`} label="Quantity" error={errors.qty} className="flex-1" optional>
          <input
            id={`${p}-qty`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="Optional"
            value={draft.qtyText}
            aria-invalid={Boolean(errors.qty)}
            aria-describedby={described(`${p}-qty`, errors.qty)}
            onChange={(e) => onChange({ qtyText: e.target.value })}
            className={`${fieldClasses} tnum`}
          />
        </Field>
        <Field id={`${p}-unit`} label="Unit" error={errors.unit} className="w-32 shrink-0" optional>
          <select
            id={`${p}-unit`}
            value={draft.unit}
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={described(`${p}-unit`, errors.unit)}
            onChange={(e) => onChange({ unit: e.target.value })}
            className={fieldClasses}
          >
            <option value="">None</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id={`${p}-category`} label="Aisle" optional>
        <select
          id={`${p}-category`}
          value={draft.category}
          onChange={(e) => onChange({ category: e.target.value as ItemDraft["category"] })}
          className={fieldClasses}
        >
          <option value="">Not sorted</option>
          {SHOPPING_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </Field>
      <Field id={`${p}-note`} label="Note" error={errors.note} optional>
        <input
          id={`${p}-note`}
          type="text"
          autoComplete="off"
          placeholder="Optional, e.g. the big bag"
          maxLength={300}
          value={draft.note}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={described(`${p}-note`, errors.note)}
          onChange={(e) => onChange({ note: e.target.value })}
          className={fieldClasses}
        />
      </Field>
    </div>
  );
}

/**
 * After a failed save, move focus to the first field with an error so a
 * keyboard or screen-reader user lands on what to fix. Runs after the
 * render so a collapsed details section has opened first.
 */
export function focusFirstInvalid(nameId: string, prefix: string, errors: DraftErrors) {
  const order: Array<[keyof DraftErrors, string]> = [
    ["name", nameId],
    ["qty", `${prefix}-qty`],
    ["unit", `${prefix}-unit`],
    ["note", `${prefix}-note`],
  ];
  const first = order.find(([field]) => errors[field]);
  if (!first) return;
  window.setTimeout(() => document.getElementById(first[1])?.focus(), 0);
}

export const EMPTY_DRAFT: ItemDraft = { name: "", qtyText: "", unit: "", note: "", category: "" };
