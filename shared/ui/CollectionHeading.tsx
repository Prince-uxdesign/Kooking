import type { ReactNode } from "react";

export interface CollectionHeadingProps {
  /** The heading title text. */
  title: string;
  /** Accessible id for `aria-labelledby`. */
  id?: string;
  /** Optional secondary subtitle or explanation. */
  description?: string;
  /** Optional metadata tag (e.g. recipe count). */
  meta?: string;
  /** Action placed on the right (e.g. SeeAllLink or button). */
  action?: ReactNode;
  /** Heading semantic level (2 or 3). Defaults to 2. */
  level?: 2 | 3;
  className?: string;
}

/**
 * Collection Heading (Clean Kitchen system):
 * - Quiet, confident 20px semibold title
 * - Optional inline count or description
 * - Aligned action button or "See all ›" link
 */
export function CollectionHeading({
  title,
  id,
  description,
  meta,
  action,
  level = 2,
  className = "",
}: CollectionHeadingProps) {
  const HeadingTag = `h${level}` as "h2" | "h3";

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <HeadingTag id={id} className="text-[1.25rem] font-semibold leading-7 text-ink-900">
            {title}
          </HeadingTag>
          {meta && <span className="tnum text-[0.875rem] text-ink-500">{meta}</span>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {description && <p className="text-[0.875rem] leading-5 text-ink-500">{description}</p>}
    </div>
  );
}
