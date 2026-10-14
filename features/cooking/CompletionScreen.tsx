"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { CompletionSummary } from "@/shared/domain/cooking-session";
import { kitchenCheckHref, recipeHref } from "@/shared/domain/navigation";

const pill =
  "inline-flex min-h-[56px] items-center justify-center rounded-full px-6 text-[1rem] font-medium transition-colors";

function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * Shown when a session completes, and whenever a completed session is
 * opened again (old link, refresh). The record is kept; nothing here
 * can reopen it.
 */
export function CompletionScreen({
  summary,
  recipeSlug,
  demo,
  justFinished,
}: {
  summary: CompletionSummary;
  recipeSlug: string;
  demo: boolean;
  justFinished: boolean;
}) {
  const finishedAt = new Date(summary.completedAt).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <section
      aria-labelledby="complete-title"
      className="flex flex-col gap-6 rounded-[32px] bg-white/5 p-6 sm:p-8"
    >
      <span
        aria-hidden
        className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-500 text-ink-900"
      >
        <CheckCircle2 size={32} strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 id="complete-title" className="text-[1.875rem] font-semibold leading-9 text-white">
          {justFinished ? "You did it" : "Cooking complete"}
        </h1>
        <p className="text-[1.0625rem] leading-7 text-white/80">
          {summary.recipeTitle} · {summary.servings} servings
        </p>
      </div>
      <dl className="tnum grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white/5 p-4">
          <dt className="text-[0.8125rem] text-white/60">Steps done</dt>
          <dd className="text-[1.375rem] font-semibold text-white">{summary.stepsDone}</dd>
        </div>
        <div className="rounded-3xl bg-white/5 p-4">
          <dt className="text-[0.8125rem] text-white/60">Start to finish</dt>
          <dd className="text-[1.375rem] font-semibold text-white">
            {durationText(summary.minutes)}
          </dd>
        </div>
      </dl>
      <p className="text-[0.875rem] text-white/60">
        Finished {finishedAt}.{demo ? " This was a demo recipe, not chef-tested." : ""}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className={`${pill} bg-primary-500 text-ink-900 hover:bg-primary-400 sm:flex-1`}
        >
          Back to Home
        </Link>
        <Link
          href={recipeHref(recipeSlug, { servings: summary.servings })}
          className={`${pill} bg-white/10 text-white hover:bg-white/20`}
        >
          View recipe
        </Link>
        <Link
          href={kitchenCheckHref(recipeSlug, { servings: summary.servings })}
          className={`${pill} bg-white/10 text-white hover:bg-white/20`}
        >
          Cook it again
        </Link>
      </div>
    </section>
  );
}
