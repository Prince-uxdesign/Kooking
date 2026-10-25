import type { ReactNode } from "react";

/**
 * White card on the warm page: a hairline edge and a long, soft lift.
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
    <div className={`rounded-3xl bg-white card-edge ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}
