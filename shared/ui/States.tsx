import { CookingPot, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-6">
      <span
        aria-hidden
        className="h-6 w-6 animate-spin rounded-full border-[3px] border-surface-200 border-t-primary-500"
      />
      <p className="text-[0.9375rem] font-medium text-ink-600">{label}</p>
    </div>
  );
}

/** Heading level for state cards: 3 inside a section, 2 or 1 when the card is the page's content. */
type HeadingLevel = 1 | 2 | 3;
const heading = (level: HeadingLevel) => `h${level}` as "h1" | "h2" | "h3";

export function EmptyState({
  title,
  message,
  action,
  headingLevel = 3,
}: {
  title: string;
  message: string;
  action?: ReactNode;
  headingLevel?: HeadingLevel;
}) {
  const Heading = heading(headingLevel);
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface-100 px-6 py-12 text-center">
      <span
        aria-hidden
        className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-900"
      >
        <CookingPot size={26} strokeWidth={1.75} />
      </span>
      <Heading className="text-[1.125rem] font-semibold text-ink-900">{title}</Heading>
      <p className="max-w-sm text-[0.9375rem] leading-6 text-ink-500">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again. Your cooking progress is kept on this device.",
  onRetry,
  headingLevel = 3,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  headingLevel?: HeadingLevel;
}) {
  const Heading = heading(headingLevel);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-3xl bg-error-100/60 px-6 py-12 text-center"
    >
      <span
        aria-hidden
        className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-error-700"
      >
        <TriangleAlert size={26} strokeWidth={1.75} />
      </span>
      <Heading className="text-[1.125rem] font-semibold text-ink-900">{title}</Heading>
      <p className="max-w-sm text-[0.9375rem] leading-6 text-ink-600">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex min-h-[48px] items-center rounded-full bg-ink-900 px-6 text-[0.9375rem] font-medium text-white hover:bg-ink-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ label = "Loading content" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2.5">
      <div className="h-36 animate-pulse rounded-3xl bg-surface-100" />
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-100" />
      <div className="h-4 w-1/2 animate-pulse rounded-full bg-surface-100" />
    </div>
  );
}
