import type { InputHTMLAttributes } from "react";
import { useId } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Shared field styling: flat gray pill-ish field, white with a dark edge on focus. */
export const fieldClasses =
  "min-h-[52px] w-full rounded-2xl border border-transparent bg-surface-100 px-4 text-[16px] text-ink-900 placeholder:text-ink-500 transition-colors focus:border-ink-900 focus:bg-white focus:outline-none aria-[invalid=true]:border-error-700";

/** Labelled text input. Placeholder is never the only label. */
export function TextInput({ label, error, hint, id, className = "", ...rest }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink-900">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={fieldClasses}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-[13px] leading-5 text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
