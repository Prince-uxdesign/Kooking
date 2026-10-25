"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Ear,
  Eye,
  Flame,
  Hand,
  Pause,
  Play,
  Timer as TimerIcon,
  Sparkles,
  UtensilsCrossed,
  Wind,
} from "lucide-react";
import type { CueKind } from "@/shared/domain/cues";
import { memo, useEffect, useRef, useState, type Ref } from "react";
import { StepPhoto } from "@/shared/ui/StepPhoto";
import {
  stepList,
  type ProgressSummary,
  type StepDisplay,
  type StepIngredient,
} from "@/shared/domain/cooking-session";

function Progress({ progress, done }: { progress: ProgressSummary; done: boolean[] }) {
  return (
    <div
      role="progressbar"
      aria-label="Cooking progress"
      aria-valuemin={0}
      aria-valuemax={progress.total}
      aria-valuenow={progress.completedCount}
      aria-valuetext={progress.spoken}
      className="flex gap-1.5"
    >
      {done.map((isDone, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
            i + 1 === progress.current
              ? "bg-primary-600"
              : isDone
                ? "bg-primary-200"
                : "bg-surface-200"
          }`}
        />
      ))}
    </div>
  );
}

function Detail({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-edge flex flex-col gap-2 rounded-3xl bg-white p-5">
      <h3 className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink-500">
        <span aria-hidden className="text-primary-700">
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function portionText(i: StepIngredient): string | null {
  if (i.portion === "part" && i.totalQuantity) return `Part of ${i.totalQuantity}`;
  if (i.portion === "recipe-total" && i.kind === "amount") return "Total for the whole recipe";
  if (i.portion === "recipe-total" && i.totalQuantity) return `${i.totalQuantity} in total`;
  return null;
}

/** One ingredient: name and amount on one line, context underneath. */
function IngredientLine({ item }: { item: StepIngredient }) {
  const portion = portionText(item);
  const extras = [
    portion,
    item.alsoInSteps.length > 0 ? `Also in ${stepList(item.alsoInSteps)}` : null,
    item.notScaled ? "Not adjusted for servings" : null,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-1">
      <span className="sr-only">{item.spoken}</span>
      <div aria-hidden className="flex items-baseline justify-between gap-4">
        <span className="min-w-0 break-words text-[1.0625rem] leading-6 text-ink-900">
          {item.name}
          {item.preparation && <span className="text-ink-500">, {item.preparation}</span>}
        </span>
        <span
          className={`tnum shrink-0 text-right text-[1.0625rem] font-medium leading-6 ${
            item.kind === "amount" ? "text-ink-900" : "text-ink-600"
          }`}
        >
          {item.quantity}
        </span>
      </div>
      {extras.length > 0 && (
        <p aria-hidden className="text-[0.875rem] leading-5 text-ink-500">
          {extras.join(" · ")}
        </p>
      )}
      {item.note && (
        <p aria-hidden className="text-[0.875rem] leading-5 text-ink-600">
          {item.note}
        </p>
      )}
    </li>
  );
}

const CUE_ICON: Record<CueKind, React.ReactNode> = {
  visual: <Eye size={16} strokeWidth={1.75} />,
  texture: <Hand size={16} strokeWidth={1.75} />,
  aroma: <Wind size={16} strokeWidth={1.75} />,
  sound: <Ear size={16} strokeWidth={1.75} />,
  other: <Sparkles size={16} strokeWidth={1.75} />,
};

/**
 * Sensory cues and the completion check for one step. Cues say what
 * to notice while cooking; "Ready to move on when" is the doneness
 * check. Neither is implied by a timer.
 */
function CueCard({ step, hasTime }: { step: StepDisplay; hasTime: boolean }) {
  return (
    <section
      aria-labelledby="step-cues"
      className="flex flex-col gap-4 rounded-3xl bg-primary-50/70 p-5 ring-1 ring-primary-100"
    >
      {step.cues.length > 0 && (
        <>
          <h3
            id="step-cues"
            className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-primary-800"
          >
            <Eye aria-hidden size={18} strokeWidth={1.75} />
            What to look for
          </h3>
          <dl className="flex flex-col gap-3">
            {step.cues.map((cue) => (
              <div key={cue.kind} className="flex flex-col gap-0.5">
                <dt className="inline-flex items-center gap-1.5 text-[0.875rem] text-ink-500">
                  <span aria-hidden>{CUE_ICON[cue.kind]}</span>
                  {cue.label}
                </dt>
                <dd className="break-words text-[1.0625rem] leading-7 text-ink-900">{cue.text}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {step.completionNote && (
        <div className={`flex flex-col gap-1 ${step.cues.length > 0 ? "pt-2" : ""}`}>
          <h3
            id={step.cues.length > 0 ? undefined : "step-cues"}
            className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-primary-800"
          >
            <Check aria-hidden size={18} strokeWidth={1.75} />
            Ready to move on when
          </h3>
          <p className="break-words text-[1.0625rem] font-medium leading-7 text-ink-900">
            {step.completionNote}
          </p>
        </div>
      )}
      {hasTime && (
        <p className="text-[0.875rem] leading-5 text-ink-600">
          Times are a guide. Go by these signs before moving on.
        </p>
      )}
    </section>
  );
}

export interface CookingStepProps {
  step: StepDisplay;
  progress: ProgressSummary;
  /** Completion state per step, in order (for the progress bar). */
  doneSteps: boolean[];
  recipeTitle: string;
  servings: number;
  demo: boolean;
  paused: boolean;
  notice: string | null;
  error: string | null;
  busy: boolean;
  /** Receives focus after every step change so screen readers announce the new step. */
  headingRef?: Ref<HTMLHeadingElement>;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onPause: () => void;
  onResume: () => void;
  /** Finished-timer alerts from other steps (top of the step). */
  alertSlot?: React.ReactNode;
  /** This step's timer, pinned in the dock with the step controls. */
  timerSlot?: React.ReactNode;
  /** Sound and background-alert settings for the running timer (in the page). */
  timerExtrasSlot?: React.ReactNode;
  /** The step has a timer (so cues can note that time is only a guide). */
  hasTimer?: boolean;
  /** Running timers from other steps (pinned above the controls). */
  barSlot?: React.ReactNode;
  /** Finish confirmation / blockers, shown right above the controls. */
  promptSlot?: React.ReactNode;
  /** Save / connection status (only rendered when there's something to say). */
  statusSlot?: React.ReactNode;
  /** Read-aloud controls (right under the instruction, secondary to it). */
  speechSlot?: React.ReactNode;
  /** Voice-command explainer (in the page, under read-aloud). */
  voiceHelpSlot?: React.ReactNode;
  /** Mic toggle, in the fixed controls between Back and the primary action. */
  micSlot?: React.ReactNode;
  /** Mic state and command feedback, pinned above the controls. */
  voiceStatusSlot?: React.ReactNode;
  /** Keep-screen-on switch and its status (top of the step). */
  wakeSlot?: React.ReactNode;
}

/**
 * One step of Cooking Mode. Purely presentational: every value comes
 * from the session via `stepDisplay`, and every action is a callback
 * into the session service. Instruction text is shown verbatim.
 */
export const CookingStep = memo(function CookingStep({
  step,
  progress,
  doneSteps,
  recipeTitle,
  servings,
  demo,
  paused,
  notice,
  error,
  busy,
  headingRef,
  onPrevious,
  onNext,
  onFinish,
  onPause,
  onResume,
  alertSlot,
  timerSlot,
  timerExtrasSlot,
  hasTimer = false,
  barSlot,
  promptSlot,
  statusSlot,
  speechSlot,
  voiceHelpSlot,
  micSlot,
  voiceStatusSlot,
  wakeSlot,
}: CookingStepProps) {
  const chips = [
    step.heat && { icon: <Flame size={18} strokeWidth={1.75} />, text: step.heat },
    step.duration && { icon: <Clock size={18} strokeWidth={1.75} />, text: step.duration },
    step.timerLabel && {
      icon: <TimerIcon size={18} strokeWidth={1.75} />,
      text: `Timer: ${step.timerLabel}`,
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; text: string }>;

  // The dock grows with the timer and prompts; keep the page clear of it.
  const dockRef = useRef<HTMLElement>(null);
  const [dockHeight, setDockHeight] = useState(0);
  useEffect(() => {
    const el = dockRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setDockHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const primaryAction =
    "inline-flex min-h-14 flex-[1_1_8.5rem] items-center justify-center gap-2 rounded-full bg-ink-900 text-[1.0625rem] font-semibold text-white transition-[background-color,scale] duration-150 ease-out hover:bg-ink-800 active:scale-[0.98] disabled:opacity-50";

  return (
    <div
      className={`flex flex-col gap-6 sm:gap-7 ${timerSlot ? "pb-80" : barSlot || promptSlot || voiceStatusSlot ? "pb-72" : "pb-40"}`}
      style={dockHeight ? { paddingBottom: dockHeight + 32 } : undefined}
    >
      {/* Context: present, quiet. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-1.5">
          <h1 className="break-words text-[0.9375rem] font-medium leading-6 text-ink-500">
            {recipeTitle}
            <span className="tnum"> · {servings} servings</span>
          </h1>
          {demo && (
            <p className="w-fit rounded-full bg-surface-100 px-3 py-1 text-[0.8125rem] font-medium text-ink-700">
              Demo recipe · not chef-tested
            </p>
          )}
        </div>
        {!paused && (
          <button
            type="button"
            onClick={onPause}
            disabled={busy}
            className="card-edge inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[0.9375rem] font-medium text-ink-900 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-100 active:scale-[0.97] disabled:opacity-40"
          >
            <Pause aria-hidden size={18} strokeWidth={1.75} />
            Pause
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            ref={headingRef}
            tabIndex={-1}
            // Programmatic focus target only (never a Tab stop), so no ring.
            style={{ outline: "none" }}
            className="tnum font-label text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-primary-700"
          >
            Step {step.number} of {step.total}
            {paused && <span className="text-ink-500"> · Paused</span>}
            {step.completed && (
              <span className="ml-2 inline-flex items-center gap-1 text-success-700">
                <Check aria-hidden size={14} strokeWidth={2.5} />
                Done
              </span>
            )}
          </h2>
          <p className="tnum text-[0.8125rem] text-ink-500">
            {progress.completedCount} of {progress.total} done
          </p>
        </div>
        <Progress progress={progress} done={doneSteps} />
      </div>

      {wakeSlot}
      {statusSlot}
      {alertSlot}

      {notice && (
        <p
          role="status"
          className="card-edge rounded-2xl bg-white px-4 py-3 text-[0.9375rem] text-ink-700"
        >
          {notice}
        </p>
      )}
      {paused && (
        <p
          role="status"
          className="rounded-2xl bg-warning-100 px-4 py-3 text-[0.9375rem] text-warning-700"
        >
          Cooking is paused. Anything on the heat keeps cooking, so check your pot.
        </p>
      )}

      {/* The one thing to do now. */}
      <p
        className={`break-words font-headline text-[1.625rem] font-normal leading-[1.3] tracking-[-0.015em] sm:text-[2rem] md:text-[2.25rem] ${
          paused ? "text-ink-500" : "text-ink-900"
        }`}
      >
        {step.instruction}
      </p>

      {step.image && (
        <StepPhoto
          key={step.image.src}
          image={step.image}
          className="aspect-[4/3] max-w-xl rounded-3xl bg-surface-200 sm:aspect-[16/10]"
        />
      )}

      {speechSlot}
      {voiceHelpSlot}

      {step.safetyNote && (
        <p className="flex items-start gap-3 rounded-3xl bg-warning-100 p-4 text-[1rem] leading-6 text-warning-700">
          <AlertTriangle aria-hidden size={20} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span className="break-words">
            <span className="font-semibold">Safety: </span>
            {step.safetyNote}
          </span>
        </p>
      )}

      {step.ingredients.length > 0 && (
        <section
          aria-labelledby="step-ingredients"
          className="card-edge flex flex-col gap-3 rounded-3xl bg-white p-5"
        >
          <h3
            id="step-ingredients"
            className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-ink-900"
          >
            <UtensilsCrossed
              aria-hidden
              size={18}
              strokeWidth={1.75}
              className="text-primary-700"
            />
            You need for this step
            <span className="tnum -ml-1 font-normal text-ink-500">· {servings} servings</span>
          </h3>
          <ul className="flex flex-col gap-4">
            {step.ingredients.map((i) => (
              <IngredientLine key={i.lineId} item={i} />
            ))}
          </ul>
        </section>
      )}

      {chips.length > 0 && (
        <ul aria-label="Step details" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c.text}
              className="card-edge inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-3.5 text-[0.875rem] font-medium text-ink-900"
            >
              <span aria-hidden className="text-primary-700">
                {c.icon}
              </span>
              {c.text}
            </li>
          ))}
        </ul>
      )}

      {(step.cues.length > 0 || step.completionNote) && (
        <CueCard step={step} hasTime={chips.length > 0 || hasTimer} />
      )}

      {step.preparationNotes && (
        <Detail icon={<UtensilsCrossed size={18} strokeWidth={1.75} />} title="Prep">
          <p className="break-words text-[1.0625rem] leading-7 text-ink-900">
            {step.preparationNotes}
          </p>
        </Detail>
      )}

      {timerExtrasSlot}

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-error-100 px-4 py-3 text-[0.9375rem] text-error-700"
        >
          {error}
        </p>
      )}

      {/* The dock: the timer and the step controls, always on screen, never scrolled away.
          One primary action; Back is smaller and set apart so it can't be hit by mistake. */}
      <nav
        ref={dockRef}
        aria-label="Step controls"
        className="glass-bar safe-bottom fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] border-t border-line-default shadow-[0_-12px_32px_-16px_rgb(21_18_15/0.18)]"
      >
        {promptSlot && (
          <div className="mx-auto w-full max-w-[880px] px-4 pt-3 sm:px-6">{promptSlot}</div>
        )}
        {barSlot && <div className="mx-auto w-full max-w-[880px] px-4 pt-3 sm:px-6">{barSlot}</div>}
        {voiceStatusSlot && (
          <div className="mx-auto w-full max-w-[880px] px-4 pt-3 sm:px-6">{voiceStatusSlot}</div>
        )}
        {timerSlot && (
          <div className="mx-auto w-full max-w-[880px] px-3 pt-3 sm:px-6">{timerSlot}</div>
        )}
        <div className="mx-auto flex w-full max-w-[880px] flex-wrap items-center gap-x-2 gap-y-3 px-4 pb-4 pt-3 sm:px-6">
          <button
            type="button"
            onClick={onPrevious}
            disabled={step.isFirst || paused || busy}
            aria-label="Back to previous step"
            className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-surface-100 px-4 text-[1rem] font-medium text-ink-900 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-200 active:scale-[0.97] disabled:opacity-30"
          >
            <ArrowLeft aria-hidden size={20} strokeWidth={1.75} />
            Back
          </button>
          {micSlot}
          {paused ? (
            <button type="button" onClick={onResume} disabled={busy} className={primaryAction}>
              <Play aria-hidden size={20} strokeWidth={2} />
              Resume cooking
            </button>
          ) : step.isLast ? (
            <button type="button" onClick={onFinish} disabled={busy} className={primaryAction}>
              <Check aria-hidden size={20} strokeWidth={2.25} />
              Finish cooking
            </button>
          ) : (
            <button type="button" onClick={onNext} disabled={busy} className={primaryAction}>
              Done, next step
              <ArrowRight aria-hidden size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
});
