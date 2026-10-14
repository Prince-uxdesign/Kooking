import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Filter / category chip: flat gray pill, 44px tall. Selected turns
 * green with ink text. Links when given `href`.
 */
export function Chip({
  children,
  href,
  selected = false,
  icon,
}: {
  children: ReactNode;
  href: string;
  selected?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[0.9375rem] transition-colors ${
        selected
          ? "bg-primary-500 text-ink-900"
          : "bg-surface-100 text-ink-900 hover:bg-surface-200"
      }`}
    >
      {icon && (
        <span aria-hidden className="text-ink-600">
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}

const chipBase =
  "inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[0.9375rem] transition-colors";

/**
 * Button chip for in-page state (filters). `pressed` exposes on/off to
 * assistive tech; omit it for one-shot actions like "remove filter".
 */
export function ChipButton({
  children,
  onClick,
  pressed,
  icon,
  trailingIcon,
  label,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Accessible name when the visible text isn't enough. */
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      disabled={disabled}
      className={`${chipBase} disabled:cursor-not-allowed disabled:opacity-45 ${
        pressed ? "bg-primary-500 text-ink-900" : "bg-surface-100 text-ink-900 hover:bg-surface-200"
      } ${trailingIcon ? "pr-3.5" : ""}`}
    >
      {icon && (
        <span aria-hidden className="text-ink-600">
          {icon}
        </span>
      )}
      {children}
      {trailingIcon && (
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white"
        >
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
