"use client";

import { Check, ChevronDown, CircleHelp, ListOrdered, Lightbulb, Wrench } from "lucide-react";
import { useState } from "react";
import type { Technique } from "@/shared/domain/techniques";
import { BottomSheet } from "@/shared/ui/BottomSheet";

/**
 * "How to do this": the technique help a new cook would otherwise search
 * for, matched to the step's instruction. Each technique opens in place,
 * so the step itself stays calm until someone needs it.
 */
export function StepHelp({ techniques }: { techniques: Technique[] }) {
  if (techniques.length === 0) return null;
  return (
    <section aria-labelledby="step-help" className="flex flex-col gap-2.5">
      <h3
        id="step-help"
        className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-ink-900"
      >
        <CircleHelp aria-hidden size={18} strokeWidth={1.75} className="text-primary-700" />
        How to do this
      </h3>
      <ul className="flex flex-col gap-2">
        {techniques.map((t) => (
          <li key={t.id}>
            <details className="group card-edge rounded-3xl bg-white [&[open]>summary_svg]:rotate-180">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 rounded-3xl px-4 py-3 transition-colors hover:bg-surface-50 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"
                >
                  <Lightbulb size={18} strokeWidth={1.75} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[0.9375rem] font-semibold leading-5 text-ink-900">
                    {t.title}
                  </span>
                  <span className="text-[0.8125rem] leading-5 text-ink-500">{t.why}</span>
                </span>
                <ChevronDown
                  aria-hidden
                  size={18}
                  className="shrink-0 text-ink-500 transition-transform duration-200"
                />
              </summary>
              <div className="flex flex-col gap-4 px-4 pb-5 pt-1">
                <ol className="flex flex-col gap-2.5">
                  {t.how.map((line, i) => (
                    <li key={i} className="flex gap-3 text-[0.9375rem] leading-6 text-ink-900">
                      <span
                        aria-hidden
                        className="tnum mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-100 text-[0.6875rem] font-semibold text-ink-700"
                      >
                        {i + 1}
                      </span>
                      {line}
                    </li>
                  ))}
                </ol>

                <div className="flex flex-col gap-1.5 rounded-2xl bg-success-100/60 p-3.5">
                  <p className="text-[0.8125rem] font-semibold text-success-700">
                    You&apos;ll know it&apos;s right when
                  </p>
                  <ul className="flex flex-col gap-1">
                    {t.signs.map((sign) => (
                      <li key={sign} className="flex gap-2 text-[0.875rem] leading-5 text-ink-900">
                        <Check
                          aria-hidden
                          size={15}
                          strokeWidth={2.5}
                          className="mt-0.5 shrink-0 text-success-700"
                        />
                        {sign}
                      </li>
                    ))}
                  </ul>
                </div>

                {t.fixes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-700">
                      <Wrench aria-hidden size={14} strokeWidth={1.75} />
                      If something&apos;s not right
                    </p>
                    <dl className="flex flex-col gap-2">
                      {t.fixes.map((f) => (
                        <div key={f.problem} className="rounded-2xl bg-surface-50 p-3.5">
                          <dt className="text-[0.875rem] font-semibold leading-5 text-ink-900">
                            {f.problem}
                          </dt>
                          <dd className="mt-0.5 text-[0.875rem] leading-5 text-ink-600">{f.fix}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface UpNextInfo {
  number: number;
  instruction: string;
  /** Names of what the next step uses, to get ready now. */
  ingredients: string[];
}

/**
 * What's coming, so nothing catches the cook out. While a timer runs it
 * turns into "while you wait": the moment to prep the next step.
 */
export function UpNext({ next, waiting }: { next: UpNextInfo; waiting: boolean }) {
  return (
    <section
      aria-label={`Up next: step ${next.number}`}
      className="flex flex-col gap-2 rounded-3xl border border-dashed border-line-strong p-4"
    >
      <p className="font-label text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
        {waiting
          ? `While you wait · get ready for step ${next.number}`
          : `Up next · step ${next.number}`}
      </p>
      <p className="line-clamp-3 text-[0.9375rem] leading-6 text-ink-700">{next.instruction}</p>
      {next.ingredients.length > 0 && (
        <p className="text-[0.8125rem] leading-5 text-ink-500">
          <span className="font-medium text-ink-700">Have ready: </span>
          {next.ingredients.join(", ")}
        </p>
      )}
    </section>
  );
}

export interface StepOverview {
  number: number;
  instruction: string;
  done: boolean;
  current: boolean;
}

/** "All steps": the whole recipe at a glance, with a jump to any step. */
export function AllSteps({
  steps,
  disabled,
  onJump,
}: {
  steps: StepOverview[];
  disabled: boolean;
  onJump: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-ink-700 transition-[background-color,scale] duration-150 ease-out hover:bg-white active:scale-[0.97]"
      >
        <ListOrdered aria-hidden size={17} strokeWidth={1.75} />
        All steps
      </button>
      <BottomSheet title="All steps" open={open} onClose={() => setOpen(false)}>
        <ol className="flex flex-col gap-1.5 text-left">
          {steps.map((s, i) => (
            <li key={s.number}>
              <button
                type="button"
                disabled={disabled || s.current}
                onClick={() => {
                  setOpen(false);
                  onJump(i);
                }}
                aria-current={s.current ? "step" : undefined}
                className={`flex min-h-[56px] w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors disabled:cursor-default ${
                  s.current ? "bg-primary-50 ring-1 ring-primary-200" : "hover:bg-surface-50"
                }`}
              >
                <span
                  aria-hidden
                  className={`tnum inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold ${
                    s.done
                      ? "bg-success-100 text-success-700"
                      : s.current
                        ? "bg-primary-600 text-white"
                        : "bg-surface-100 text-ink-700"
                  }`}
                >
                  {s.done ? <Check size={14} strokeWidth={3} /> : s.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="sr-only">
                    Step {s.number}
                    {s.done ? ", done" : ""}
                    {s.current ? ", current" : ""}:{" "}
                  </span>
                  <span className="line-clamp-2 text-[0.9375rem] leading-6 text-ink-900">
                    {s.instruction}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </BottomSheet>
    </>
  );
}
