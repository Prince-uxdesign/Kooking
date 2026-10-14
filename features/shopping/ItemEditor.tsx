"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  draftFromItem,
  validateDraft,
  type DraftErrors,
  type ShoppingItem,
  type ValidDraft,
} from "@/shared/domain/shopping";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button } from "@/shared/ui/Button";
import { fieldClasses } from "@/shared/ui/TextInput";
import { ItemDetailFields } from "./ItemFields";

/** Edit sheet. Mount with a `key` per item so the draft resets. */
export function ItemEditor({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: ShoppingItem;
  onClose: () => void;
  onSave: (value: ValidDraft) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(() => draftFromItem(item));
  const [errors, setErrors] = useState<DraftErrors>({});

  const save = (e?: React.FormEvent) => {
    e?.preventDefault();
    const result = validateDraft(draft);
    if (!result.ok) return setErrors(result.errors);
    onSave(result.value);
  };

  return (
    <BottomSheet
      title="Edit item"
      open
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={onDelete} className="flex-1">
            <Trash2 aria-hidden size={18} strokeWidth={1.75} />
            Remove
          </Button>
          <Button variant="primary" onClick={() => save()} className="flex-1">
            Save
          </Button>
        </div>
      }
    >
      <form onSubmit={save} noValidate className="flex flex-col gap-4 text-left">
        {item.origin === "recipe" && (
          <p className="rounded-2xl bg-surface-100 p-4 text-[14px] leading-5 text-ink-600">
            From {item.recipeTitle ?? "a recipe"}. Your changes are kept if you shop for this recipe
            again.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-item-name" className="text-sm font-medium text-ink-900">
            Item name
          </label>
          <input
            id="edit-item-name"
            type="text"
            autoComplete="off"
            maxLength={120}
            value={draft.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "edit-item-name-error" : undefined}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={fieldClasses}
          />
          {errors.name && (
            <p
              id="edit-item-name-error"
              role="alert"
              className="text-[13px] font-medium text-error-700"
            >
              {errors.name}
            </p>
          )}
        </div>
        <ItemDetailFields
          idPrefix="edit-item"
          draft={draft}
          errors={errors}
          onChange={(patch) => setDraft({ ...draft, ...patch })}
        />
        {/* Enter in any field saves. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </BottomSheet>
  );
}
