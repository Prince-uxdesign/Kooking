import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

/** 44px row checkbox. Status text accompanies the check, not color alone. */
export function Checkbox({ label, description, className = "", ...rest }: CheckboxProps) {
  return (
    <label
      className={`flex min-h-[52px] cursor-pointer items-start gap-3 card-edge rounded-[20px] bg-white px-4 py-3.5 transition-colors hover:bg-surface-50 ${className}`}
    >
      <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[#f0571a]" {...rest} />
      <span className="flex flex-col">
        <span className="text-[0.9375rem] leading-6 text-ink-900">{label}</span>
        {description && (
          <span className="text-[0.8125rem] leading-5 text-ink-500">{description}</span>
        )}
      </span>
    </label>
  );
}
