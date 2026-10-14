import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/shared/ui/Button";

/**
 * Header for category and collection pages: a back pill to Explore,
 * a white icon circle on gray, the title, what it covers, and a count.
 */
export function DiscoveryHeader({
  title,
  description,
  meta,
  Icon,
}: {
  title: string;
  description: string;
  meta: string;
  Icon: LucideIcon;
}) {
  return (
    <header className="flex flex-col gap-6">
      <Link
        href="/recipes"
        className={buttonClasses({ variant: "secondary", className: "w-fit pl-4 pr-5" })}
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
        Explore
      </Link>
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-100 text-ink-900"
        >
          <Icon size={24} strokeWidth={1.75} />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[1.875rem] font-semibold leading-9 text-ink-900 sm:text-[2.125rem] sm:leading-[42px]">
            {title}
          </h1>
          <p className="max-w-prose text-[1rem] leading-6 text-ink-500">{description}</p>
          <p className="tnum text-[0.8125rem] leading-5 text-ink-500">{meta}</p>
        </div>
      </div>
    </header>
  );
}
