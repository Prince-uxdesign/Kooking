import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "dark" | "light" | "brand";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[color,background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const sizes: Record<Size, string> = {
  md: "min-h-[48px] px-6 text-[0.9375rem]",
  lg: "min-h-[56px] px-8 text-[1rem]",
};

/**
 * Pills. Primary is ink (the landing page's CTA); orange is reserved for
 * `brand`, which takes white text at large, bold sizes only.
 */
const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-ink-800",
  secondary: "bg-white text-ink-900 card-edge hover:bg-surface-100",
  tertiary: "bg-transparent text-ink-900 hover:bg-surface-100 px-4",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  light: "bg-white text-ink-900 hover:bg-surface-100",
  brand: "bg-primary-600 font-semibold text-white hover:bg-primary-700",
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
