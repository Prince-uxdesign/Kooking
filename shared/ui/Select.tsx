import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { fieldClasses } from "./TextInput";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

/** Native select — reliable on mobile, keyboard accessible by default. */
export function Select({ label, error, id, children, className = "", ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={selectId} className="text-sm font-medium text-ink-900">
        {label}
      </label>
      <select id={selectId} aria-invalid={Boolean(error)} className={fieldClasses} {...rest}>
        {children}
      </select>
      {error && (
        <p role="alert" className="text-[0.8125rem] font-medium text-error-700">
          {error}
        </p>
      )}
    </div>
  );
}
