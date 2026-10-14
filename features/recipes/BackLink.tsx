"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { backTargetFor, type BackTarget } from "@/shared/domain/navigation";
import { buttonClasses } from "@/shared/ui/Button";

function BackPill({ href, label }: BackTarget) {
  return (
    <Link
      href={href}
      className={buttonClasses({ variant: "secondary", className: "w-fit pl-4 pr-5" })}
    >
      <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
      {label}
    </Link>
  );
}

/**
 * Recipe page back link. Returns to wherever the card was tapped
 * (Home, Explore, a category or collection) via `?from=`; unknown or
 * missing values fall back to Explore. Wrap in <Suspense> with
 * <BackLinkFallback /> so the page stays static.
 */
export function BackLink({ collectionTitles }: { collectionTitles: Record<string, string> }) {
  const from = useSearchParams().get("from");
  return <BackPill {...backTargetFor(from, collectionTitles)} />;
}

export function BackLinkFallback() {
  return <BackPill {...backTargetFor(null)} />;
}
