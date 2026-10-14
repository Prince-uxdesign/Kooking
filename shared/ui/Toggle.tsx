"use client";

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  id?: string;
}

/** Switch toggle with accessible role and visible state text. */
export function Toggle({ label, checked, onChange, description, id }: ToggleProps) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-4 rounded-[20px] bg-surface-100 px-4 py-3">
      <span className="flex flex-col">
        <span id={id ? `${id}-label` : undefined} className="text-[15px] text-ink-900">
          {label}
        </span>
        {description && <span className="text-[13px] text-ink-500">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-label={id ? undefined : label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary-500" : "bg-surface-300"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
