"use client";

import { Check } from "lucide-react";
import { Badge } from "./Badge";
import type { IngredientRole } from "@/shared/domain/recipe-schema";

const roleLabel: Record<IngredientRole, string> = {
  required: "Required",
  optional: "Optional",
  substitutable: "Swappable",
  garnish: "Garnish",
};

/**
 * Structured ingredient row. Readiness uses icon + text, never color alone.
 * Pure presentational — readiness math lives in domain (Phase 1).
 */
export function IngredientRow({
  name,
  quantity,
  role,
  checked,
  onToggle,
  note,
}: {
  name: string;
  quantity: string;
  role: IngredientRole;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  note?: string;
}) {
  return (
    <li className="list-none">
      <label
        className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[20px] px-4 py-3 transition-colors ${
          checked ? "bg-primary-100" : "bg-surface-100 hover:bg-surface-200"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`${name}, ${quantity}, ${roleLabel[role]}`}
          className="h-5 w-5 shrink-0 accent-[#111311]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] text-ink-900">{name}</span>
            <span className="tnum shrink-0 text-[15px] font-medium text-ink-900">{quantity}</span>
          </span>
          {note && <span className="text-[13px] leading-5 text-ink-500">{note}</span>}
        </span>
        <Badge tone={role === "required" ? "white" : "info"}>{roleLabel[role]}</Badge>
        {checked && (
          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-success-700">
            <Check aria-hidden size={14} strokeWidth={2.5} />
            Have it
          </span>
        )}
      </label>
    </li>
  );
}
