"use client";

import { Minus, Plus } from "lucide-react";

export interface QuantityInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  id?: string;
}

/**
 * Accessible Stepper for servings and quantities.
 * Implements WAI-ARIA spinbutton keyboard conventions and 44px touch targets.
 */
export function QuantityInput({
  label,
  value,
  min = 1,
  max = 24,
  step = 1,
  onChange,
  id,
}: QuantityInputProps) {
  const clamp = (n: number) => {
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(clamp(value + step));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onChange(clamp(value - step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      onChange(clamp(value + step * 2));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      onChange(clamp(value - step * 2));
    }
  };

  const decreaseTarget = Math.max(min, value - step);
  const increaseTarget = Math.min(max, value + step);

  return (
    <div
      id={id}
      className="flex min-h-[52px] items-center justify-between gap-3 rounded-[20px] bg-surface-100 py-1.5 pl-4 pr-1.5"
    >
      <span className="text-[15px] font-medium text-ink-900">{label}</span>
      <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-xs">
        <button
          type="button"
          aria-label={`Decrease ${label} to ${decreaseTarget}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-ink-900 transition-colors hover:bg-surface-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Minus aria-hidden size={18} strokeWidth={2.2} />
        </button>

        <div
          role="spinbutton"
          tabIndex={0}
          aria-live="polite"
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          onKeyDown={handleKeyDown}
          className="tnum min-w-[2.75rem] px-1 text-center text-[17px] font-semibold text-ink-900 select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          {value}
        </div>

        <button
          type="button"
          aria-label={`Increase ${label} to ${increaseTarget}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-ink-900 transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus aria-hidden size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
