"use client";

import { AlertTriangle, CheckCircle2, Pause, Timer as TimerIcon } from "lucide-react";
import Link from "next/link";
import { cookHref } from "@/features/recipes/start-cooking";
import { useResumableSessions } from "@/features/cooking/useResumableSessions";
import type { RecipeSummary } from "@/shared/domain/discovery";
import type { ResumeSummary, TimerGlance } from "@/shared/domain/recovery";
import { buttonClasses } from "@/shared/ui/Button";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { iconForRecipe } from "@/features/recipes/category-icons";

function TimerPill({ timer }: { timer: TimerGlance }) {
  const Icon = timer.state === "done" ? CheckCircle2 : timer.state === "paused" ? Pause : TimerIcon;
  return (
    <li
      className={`tnum inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[13px] ${
        timer.state === "done" ? "bg-primary-500 text-ink-900" : "bg-white text-ink-900"
      }`}
    >
      <Icon aria-hidden size={14} strokeWidth={1.75} />
      <span className="max-w-[9rem] truncate">{timer.label}</span>
      <span className="font-medium">· {timer.text}</span>
    </li>
  );
}

function meta(s: ResumeSummary) {
  return [s.stepLabel, `${s.servings} servings`, s.paused ? "Paused" : null]
    .filter(Boolean)
    .join(" · ");
}

/**
 * "Continue cooking …?" on Home. Shows every unfinished session on this
 * device (most recent first) with its current step and timers, and any
 * saved session that couldn't be read. Never navigates on its own.
 * Renders nothing while loading or when there's nothing to resume.
 */
export function ContinueCooking({ catalog }: { catalog: RecipeSummary[] }) {
  const { loaded, summaries, damaged } = useResumableSessions();
  if (!loaded || (summaries.length === 0 && damaged.length === 0)) return null;

  const [first, ...others] = summaries;
  const recipe = first ? (catalog.find((r) => r.id === first.recipeId) ?? null) : null;

  return (
    <section
      aria-labelledby="continue-heading"
      className="flex flex-col gap-2 rounded-3xl bg-surface-100 p-2"
    >
      {first && (
        <div className="flex flex-col gap-3 rounded-[20px] p-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3.5">
            <RecipeImage
              image={recipe?.image}
              compact
              FallbackIcon={iconForRecipe(recipe?.categories ?? [])}
              className="h-16 w-16 shrink-0 rounded-[18px]"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 id="continue-heading" className="text-[16px] font-medium leading-6 text-ink-900">
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent-500 align-middle"
                  aria-hidden
                />
                Continue cooking {first.title}?
              </h2>
              <p className="tnum text-[13px] text-ink-500">{meta(first)}</p>
              {first.stepInstruction && (
                <p className="line-clamp-2 text-[14px] leading-5 text-ink-700">
                  <span className="sr-only">Current step: </span>
                  {first.stepInstruction}
                </p>
              )}
              {first.timers.length > 0 && (
                <ul aria-label="Timers" className="mt-1 flex flex-wrap gap-1.5">
                  {first.timers.map((t) => (
                    <TimerPill key={t.id} timer={t} />
                  ))}
                </ul>
              )}
            </div>
          </div>
          <Link
            href={cookHref(first.sessionId)}
            className={buttonClasses({
              variant: "primary",
              className: "w-full shrink-0 sm:w-auto",
            })}
          >
            Continue
          </Link>
        </div>
      )}

      {others.length > 0 && (
        <ul aria-label="Other unfinished sessions" className="flex flex-col gap-1">
          {others.map((s) => (
            <li
              key={s.sessionId}
              className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink-900">{s.title}</p>
                <p className="tnum truncate text-[13px] text-ink-500">
                  {meta(s)}
                  {s.timers.length > 0
                    ? ` · ${s.timers.map((t) => `${t.label} ${t.text}`).join(", ")}`
                    : ""}
                </p>
              </div>
              <Link
                href={cookHref(s.sessionId)}
                aria-label={`Continue cooking ${s.title}`}
                className={buttonClasses({ variant: "secondary", className: "shrink-0" })}
              >
                Continue
              </Link>
            </li>
          ))}
        </ul>
      )}

      {damaged.length > 0 && (
        <div className="flex items-start gap-2 rounded-[20px] px-4 py-3 text-[14px] text-ink-700">
          <AlertTriangle aria-hidden size={16} className="mt-0.5 shrink-0 text-warning-700" />
          <p>
            {damaged.length === 1
              ? "A saved cooking session"
              : `${damaged.length} saved cooking sessions`}{" "}
            couldn&apos;t be read.{" "}
            {damaged[0].id && (
              <Link
                href={cookHref(damaged[0].id)}
                className="font-medium text-ink-900 underline underline-offset-4"
              >
                See what can be recovered
              </Link>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
