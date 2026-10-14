import { CookingPot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface EmptyCollectionStateProps {
  /** Main state title. */
  title?: string;
  /** Explanatory message. */
  message?: string;
  /** Primary icon inside the white circle. */
  Icon?: LucideIcon;
  /** Optional button or link. */
  action?: ReactNode;
  className?: string;
}

/**
 * Empty Collection State (Clean Kitchen system):
 * - Soft gray card (`rounded-3xl bg-surface-100 p-6 sm:p-8`)
 * - Centered white icon circle
 * - Quiet, reassuring copy — never blaming the user
 * - Optional CTA to explore other categories or clear filters
 */
export function EmptyCollectionState({
  title = "No recipes yet",
  message = "More recipes are on the way. The catalog grows as chef-validated recipes are added.",
  Icon = CookingPot,
  action,
  className = "",
}: EmptyCollectionStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center rounded-3xl bg-surface-100 p-6 text-center sm:p-8 ${className}`}
    >
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-700 shadow-none"
      >
        <Icon size={24} strokeWidth={1.75} />
      </span>

      <h3 className="mt-3 text-[1.0625rem] font-semibold text-ink-900">{title}</h3>

      {message && <p className="mt-1 max-w-md text-[0.875rem] leading-6 text-ink-500">{message}</p>}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
