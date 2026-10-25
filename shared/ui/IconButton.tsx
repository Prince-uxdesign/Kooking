import type { ButtonHTMLAttributes } from "react";

type Variant = "soft" | "white" | "primary" | "dark";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  /** `soft` on white pages, `white` on gray cards/photos, `primary` for the main action. */
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  soft: "bg-white text-ink-900 card-edge hover:bg-surface-100",
  white: "bg-white text-ink-900 hover:bg-surface-100",
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
};

/**
 * Circular icon-only button. `label` is required and becomes the
 * accessible name. Minimum 44px target.
 */
export function IconButton({
  label,
  variant = "soft",
  className = "",
  children,
  ...rest
}: IconButtonProps & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-[color,background-color,scale] duration-150 ease-out active:scale-95 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
