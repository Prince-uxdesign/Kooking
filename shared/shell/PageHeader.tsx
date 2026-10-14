import type { ReactNode } from "react";

/**
 * Responsive page header. Stacks title + actions on 320px,
 * spreads them on wider screens. No page-level logic inside.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[30px] font-semibold leading-9 text-ink-900 sm:text-[34px] sm:leading-[42px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-prose text-[16px] leading-6 text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
