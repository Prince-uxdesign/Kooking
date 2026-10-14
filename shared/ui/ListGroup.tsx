import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Grouped list: one soft-gray rounded container holding rows.
 * The settings/menu pattern — rows are separated by space, not lines.
 */
export function ListGroup({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-1 rounded-3xl bg-surface-100 p-2">
      {children}
    </ul>
  );
}

/**
 * One row: leading white icon circle (or thumbnail), title + optional
 * meta, trailing chevron in a white circle. The whole row is the link.
 */
export function ListRow({
  href,
  title,
  meta,
  leading,
}: {
  href: string;
  title: string;
  meta?: ReactNode;
  /** An icon (rendered in a white circle) or a full thumbnail node. */
  leading: ReactNode;
}) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className="flex min-h-[64px] items-center gap-3.5 rounded-[20px] px-2 py-2 transition-colors hover:bg-white/70"
      >
        {leading}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="line-clamp-2 text-[16px] leading-6 text-ink-900">{title}</span>
          {meta && <span className="text-[13px] leading-5 text-ink-500">{meta}</span>}
        </span>
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-ink-900"
        >
          <ChevronRight size={18} />
        </span>
      </Link>
    </li>
  );
}

/** The standard leading icon for a ListRow. */
export function ListIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ink-900"
    >
      {children}
    </span>
  );
}
