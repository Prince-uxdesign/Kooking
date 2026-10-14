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
      className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] transition-colors ${
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
