import type { ReactNode } from "react";

/**
 * Flat soft-gray card. No border, no shadow — separation comes from
 * the gray fill against the white page and from whitespace.
 */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  /** Media-led cards opt out and pad their own body. */
  padded?: boolean;
}) {
  return (
    <div className={`rounded-3xl bg-surface-100 ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}
