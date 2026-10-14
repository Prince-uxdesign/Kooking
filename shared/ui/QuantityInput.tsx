"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

/** Stepper for servings/quantities. Round 44px buttons, value is live. */
export function QuantityInput({ label, value, min = 1, max = 12, onChange }: QuantityInputProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-[20px] bg-surface-100 py-1.5 pl-4 pr-1.5">
      <span className="text-[15px] text-ink-900">{label}</span>
      <div className="flex items-center gap-1 rounded-full bg-white p-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-ink-900 hover:bg-surface-200 disabled:opacity-40"
        >
          <Minus aria-hidden size={18} strokeWidth={2} />
        </button>
        <output
          aria-live="polite"
          aria-label={`${label}: ${value}`}
          className="tnum w-9 text-center text-[17px] font-medium"
        >
          {value}
        </output>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-ink-900 hover:bg-primary-600 disabled:opacity-40"
        >
          <Plus aria-hidden size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
