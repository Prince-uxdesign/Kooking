import Link from "next/link";
import type { ReactNode } from "react";

const chipBase =
  "inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[0.9375rem] font-medium transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97]";
const chipOn = "bg-ink-900 text-white";
const chipOff = "bg-white text-ink-900 card-edge hover:bg-surface-100";

/** Round icon well at the start of a chip, like a tiny avatar. */
function ChipIcon({ selected, children }: { selected?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
        selected ? "bg-white/15 text-white" : "bg-primary-50 text-primary-700"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Filter / category chip: white pill with a hairline, 44px tall.
 * Selected turns ink with white text. Links when given `href`.
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
      className={`${chipBase} ${selected ? chipOn : chipOff} ${icon ? "pl-1.5" : ""}`}
    >
      {icon && <ChipIcon selected={selected}>{icon}</ChipIcon>}
      {children}
    </Link>
  );
}

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
        pressed ? chipOn : chipOff
      } ${icon ? "pl-1.5" : ""} ${trailingIcon ? "pr-2" : ""}`}
    >
      {icon && <ChipIcon selected={pressed}>{icon}</ChipIcon>}
      {children}
      {trailingIcon && (
        <span
          aria-hidden
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
            pressed ? "bg-white/15" : "bg-surface-100"
          }`}
        >
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
