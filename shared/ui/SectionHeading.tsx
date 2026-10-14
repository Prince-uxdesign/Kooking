import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeading({
  title,
  action,
  description,
  id,
}: {
  title: string;
  /** For `aria-labelledby` on the enclosing section. */
  id?: string;
  action?: ReactNode;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={id} className="text-[1.25rem] font-semibold leading-7 text-ink-900">
          {title}
        </h2>
        {description && <p className="text-[0.9375rem] leading-6 text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** The one "See all ›" treatment for section headers. */
export function SeeAllLink({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-mr-3 inline-flex min-h-[44px] shrink-0 items-center gap-0.5 rounded-full px-3 text-[0.9375rem] text-ink-500 hover:bg-surface-100 hover:text-ink-900"
    >
      {label}
      <ChevronRight aria-hidden size={16} />
    </Link>
  );
}
