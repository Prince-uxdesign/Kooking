"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { validateDraft, type DraftErrors, type ValidDraft } from "@/shared/domain/shopping";
import { fieldClasses } from "@/shared/ui/TextInput";
import { EMPTY_DRAFT, ItemDetailFields, focusFirstInvalid } from "./ItemFields";

/**
 * Fast entry: type a name and press Enter. Quantity, unit, note and
 * aisle sit behind one disclosure so the common case stays one field.
 */
export function AddItemForm({ onAdd }: { onAdd: (value: ValidDraft) => void }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.qty || result.errors.unit || result.errors.note) setDetailsOpen(true);
      focusFirstInvalid("add-item-name", "add-item", result.errors);
      return;
    }
    onAdd(result.value);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    nameRef.current?.focus();
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Add an item"
      className="flex flex-col gap-3 rounded-3xl bg-white card-edge p-4 sm:p-5"
    >
      <label htmlFor="add-item-name" className="text-[0.9375rem] font-medium text-ink-900">
        Add an item
      </label>
      <div className="flex gap-2">
        <input
          ref={nameRef}
          id="add-item-name"
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="e.g. Onions"
          maxLength={120}
          value={draft.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "add-item-name-error" : undefined}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className={`${fieldClasses} !w-auto min-w-0 flex-1 bg-white`}
        />
        <button
          type="submit"
          aria-label="Add item"
          className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition-[background-color,scale] duration-150 ease-out hover:bg-primary-700 active:scale-95"
        >
          <Plus aria-hidden size={22} strokeWidth={2} />
        </button>
      </div>
      {errors.name && (
        <p
          id="add-item-name-error"
          role="alert"
          className="text-[0.8125rem] font-medium text-error-700"
        >
          {errors.name}
        </p>
      )}
      <button
        type="button"
        aria-expanded={detailsOpen}
        aria-controls="add-item-details"
        onClick={() => setDetailsOpen((o) => !o)}
        className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-ink-700 hover:bg-surface-100"
      >
        Quantity, note or aisle
        <ChevronDown
          aria-hidden
          size={16}
          className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div id="add-item-details" hidden={!detailsOpen}>
        <ItemDetailFields
          idPrefix="add-item"
          draft={draft}
          errors={errors}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
      </div>
    </form>
  );
}
