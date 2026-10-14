"use client";

import { formatRemaining, remainingMs } from "@/shared/domain/timers";
import type { FinishCheck } from "@/shared/domain/cooking-session";

const btn =
  "inline-flex min-h-[48px] items-center justify-center rounded-full px-5 text-[0.9375rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900";

/**
 * Shown right above the controls when Finish can't go straight through:
 * unfinished steps (with a way to reach them) or timers still running
 * (with an explicit confirm). Nothing is decided here; the domain's
 * `checkFinish` says what applies.
 */
export function FinishPrompt({
  check,
  now: propNow,
  onGoToStep,
  onConfirmStopTimers,
  onDismiss,
}: {
  check: FinishCheck;
  now?: number;
  onGoToStep: (stepNumber: number) => void;
  onConfirmStopTimers: () => void;
  onDismiss: () => void;
}) {
  const now = propNow ?? Date.now();
  if (check.kind === "incomplete-steps") {
    const [first] = check.steps;
    const list =
      check.steps.length === 1
        ? `Step ${first} isn't`
        : `Steps ${check.steps.slice(0, -1).join(", ")} and ${check.steps.at(-1)} aren't`;
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-3xl bg-white/10 p-4 text-white">
        <p className="text-[0.9375rem] leading-6">
          {list} marked done yet. Go back and finish {check.steps.length === 1 ? "it" : "them"}{" "}
          first.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${btn} bg-white text-ink-900 hover:bg-surface-100`}
            onClick={() => onGoToStep(first)}
          >
            Go to step {first}
          </button>
          <button
            type="button"
            className={`${btn} bg-white/10 hover:bg-white/20`}
            onClick={onDismiss}
          >
            Not now
          </button>
        </div>
      </div>
    );
  }
  if (check.kind === "timers-running") {
    const described = check.timers
      .map(
        (t) =>
          `${t.label ?? "A timer"} (${t.status === "paused" ? "paused" : `${formatRemaining(remainingMs(t, now))} left`})`,
      )
      .join(", ");
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-3xl bg-white/10 p-4 text-white">
        <p className="text-[0.9375rem] leading-6">
          {check.timers.length === 1 ? "A timer is" : "Timers are"} still going: {described}.
          Finishing will stop {check.timers.length === 1 ? "it" : "them"}.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${btn} bg-primary-500 text-ink-900 hover:bg-primary-400`}
            onClick={onConfirmStopTimers}
          >
            Finish and stop {check.timers.length === 1 ? "timer" : "timers"}
          </button>
          <button
            type="button"
            className={`${btn} bg-white/10 hover:bg-white/20`}
            onClick={onDismiss}
          >
            Keep cooking
          </button>
        </div>
      </div>
    );
  }
  return null;
}
