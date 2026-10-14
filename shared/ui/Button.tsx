import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "dark" | "light";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

const sizes: Record<Size, string> = {
  md: "min-h-[48px] px-6 text-[15px]",
  lg: "min-h-[56px] px-8 text-[16px]",
};

/** Flat pills. Green fills take ink text — white on primary-500 fails contrast. */
const variants: Record<Variant, string> = {
  primary: "bg-primary-500 text-ink-900 hover:bg-primary-600",
  secondary: "bg-surface-100 text-ink-900 hover:bg-surface-200",
  tertiary: "bg-transparent text-ink-900 hover:bg-surface-100 px-4",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  /** For use on dark surfaces. */
  light: "bg-white text-ink-900 hover:bg-surface-100",
};

/**
 * Button styling for any element. Use with <Link> so a link never
 * wraps a <button> (nested interactive content).
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...rest} />;
}
