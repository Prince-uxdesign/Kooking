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
import type { Ref } from "react";
import {
  stepList,
  type ProgressSummary,
  type StepDisplay,
  type StepIngredient,
} from "@/shared/domain/cooking-session";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900";

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
          className={`h-1.5 flex-1 rounded-full ${
            i + 1 === progress.current ? "bg-primary-500" : isDone ? "bg-white/60" : "bg-white/15"
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
    <section className="flex flex-col gap-2 rounded-3xl bg-white/5 p-5">
      <h3 className="inline-flex items-center gap-2 text-[15px] font-medium text-white/70">
        <span aria-hidden className="text-white/70">
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
        <span className="min-w-0 break-words text-[17px] leading-6 text-white">
          {item.name}
          {item.preparation && <span className="text-white/70">, {item.preparation}</span>}
        </span>
        <span
          className={`tnum shrink-0 text-right text-[17px] font-medium leading-6 ${
            item.kind === "amount" ? "text-white" : "text-white/80"
          }`}
        >
          {item.quantity}
        </span>
      </div>
      {extras.length > 0 && (
        <p aria-hidden className="text-[14px] leading-5 text-white/60">
          {extras.join(" · ")}
        </p>
      )}
      {item.note && (
        <p aria-hidden className="text-[14px] leading-5 text-white/70">
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
    <section aria-labelledby="step-cues" className="flex flex-col gap-4 rounded-3xl bg-white/5 p-5">
      {step.cues.length > 0 && (
        <>
          <h3
            id="step-cues"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-white/70"
          >
            <Eye aria-hidden size={18} strokeWidth={1.75} />
            What to look for
          </h3>
          <dl className="flex flex-col gap-3">
            {step.cues.map((cue) => (
              <div key={cue.kind} className="flex flex-col gap-0.5">
                <dt className="inline-flex items-center gap-1.5 text-[14px] text-white/60">
                  <span aria-hidden>{CUE_ICON[cue.kind]}</span>
                  {cue.label}
                </dt>
                <dd className="break-words text-[17px] leading-7 text-white">{cue.text}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {step.completionNote && (
        <div className={`flex flex-col gap-1 ${step.cues.length > 0 ? "pt-2" : ""}`}>
          <h3
            id={step.cues.length > 0 ? undefined : "step-cues"}
            className="inline-flex items-center gap-2 text-[15px] font-medium text-white/70"
          >
            <Check aria-hidden size={18} strokeWidth={1.75} />
            Ready to move on when
          </h3>
          <p className="break-words text-[17px] font-medium leading-7 text-white">
            {step.completionNote}
          </p>
        </div>
      )}
      {hasTime && (
        <p className="text-[14px] leading-5 text-white/60">
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
  /** This step's timer (right after the step's ingredients). */
  timerSlot?: React.ReactNode;
  /** The step has a timer (so cues can note that time is only a guide). */
  hasTimer?: boolean;
  /** Running timers from other steps (pinned above the controls). */
  barSlot?: React.ReactNode;
  /** Finish confirmation / blockers, shown right above the controls. */
  promptSlot?: React.ReactNode;
  /** Save / connection status (only rendered when there's something to say). */
  statusSlot?: React.ReactNode;
}

/**
 * One step of Cooking Mode. Purely presentational: every value comes
 * from the session via `stepDisplay`, and every action is a callback
 * into the session service. Instruction text is shown verbatim.
 */
export function CookingStep({
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
  hasTimer = false,
  barSlot,
  promptSlot,
  statusSlot,
}: CookingStepProps) {
  const chips = [
    step.heat && { icon: <Flame size={18} strokeWidth={1.75} />, text: step.heat },
    step.duration && { icon: <Clock size={18} strokeWidth={1.75} />, text: step.duration },
    step.timerLabel && {
      icon: <TimerIcon size={18} strokeWidth={1.75} />,
      text: `Timer: ${step.timerLabel}`,
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; text: string }>;

  return (
    <div className={`flex flex-col gap-6 sm:gap-8 ${barSlot || promptSlot ? "pb-72" : "pb-40"}`}>
      {/* Context: present, quiet. */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="break-words text-[15px] leading-6 text-white/70">
            {recipeTitle}
            <span className="tnum"> · {servings} servings</span>
          </h1>
          {demo && (
            <p className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              Demo recipe · not chef-tested
            </p>
          )}
        </div>
        {!paused && (
          <button
            type="button"
            onClick={onPause}
            disabled={busy}
            className={`inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 text-[15px] font-medium text-white hover:bg-white/20 disabled:opacity-40 ${focusRing}`}
          >
            <Pause aria-hidden size={18} strokeWidth={1.75} />
            Pause
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2
          ref={headingRef}
          tabIndex={-1}
          // Programmatic focus target only (never a Tab stop), so no ring.
          style={{ outline: "none" }}
          className="tnum text-[17px] font-medium text-white"
        >
          Step {step.number} of {step.total}
          {paused && <span className="text-white/70"> · Paused</span>}
          {step.completed && (
            <span className="ml-2 inline-flex items-center gap-1 text-[14px] text-primary-400">
              <Check aria-hidden size={16} strokeWidth={2.25} />
              Done
            </span>
          )}
        </h2>
        <Progress progress={progress} done={doneSteps} />
        <p className="tnum text-[14px] text-white/60">
          {progress.completedCount} of {progress.total} done
        </p>
      </div>

      {statusSlot}
      {alertSlot}

      {notice && (
        <p role="status" className="rounded-2xl bg-white/10 px-4 py-3 text-[15px] text-white/80">
          {notice}
        </p>
      )}
      {paused && (
        <p role="status" className="rounded-2xl bg-white/10 px-4 py-3 text-[15px] text-white/80">
          Cooking is paused. Anything on the heat keeps cooking, so check your pot.
        </p>
      )}

      {/* The one thing to do now. */}
      <p
        className={`break-words text-[24px] leading-[1.45] sm:text-[30px] md:text-[32px] ${
          paused ? "text-white/60" : "text-white"
        }`}
      >
        {step.instruction}
      </p>

      {step.safetyNote && (
        <p className="flex items-start gap-3 rounded-3xl bg-warning-100 p-4 text-[16px] leading-6 text-warning-700">
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
          className="flex flex-col gap-3 rounded-3xl bg-white/5 p-5"
        >
          <h3
            id="step-ingredients"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-white/70"
          >
            <UtensilsCrossed aria-hidden size={18} strokeWidth={1.75} />
            You need for this step
            <span className="tnum -ml-1 font-normal">· {servings} servings</span>
          </h3>
          <ul className="flex flex-col gap-4">
            {step.ingredients.map((i) => (
              <IngredientLine key={i.lineId} item={i} />
            ))}
          </ul>
        </section>
      )}

      {timerSlot}

      {chips.length > 0 && (
        <ul aria-label="Step details" className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <li
              key={c.text}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 text-[15px] text-white"
            >
              <span aria-hidden className="text-white/70">
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
          <p className="break-words text-[17px] leading-7 text-white">{step.preparationNotes}</p>
        </Detail>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-error-100 px-4 py-3 text-[15px] text-error-700">
          {error}
        </p>
      )}

      {/* Fixed, thumb-reachable controls. One primary action; Previous is
          smaller and set apart so it can't be hit by mistake. */}
      <nav
        aria-label="Step controls"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-900"
      >
        {promptSlot && (
          <div className="mx-auto w-full max-w-[880px] px-4 pt-3 sm:px-6">{promptSlot}</div>
        )}
        {barSlot && <div className="mx-auto w-full max-w-[880px] px-4 pt-3 sm:px-6">{barSlot}</div>}
        <div className="mx-auto flex w-full max-w-[880px] items-center gap-4 px-4 pb-4 pt-3 sm:px-6">
          <button
            type="button"
            onClick={onPrevious}
            disabled={step.isFirst || paused || busy}
            aria-label="Previous step"
            className={`inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-white/10 px-5 text-[16px] font-medium text-white hover:bg-white/20 disabled:opacity-30 ${focusRing}`}
          >
            <ArrowLeft aria-hidden size={20} strokeWidth={1.75} />
            Back
          </button>
          {paused ? (
            <button
              type="button"
              onClick={onResume}
              disabled={busy}
              className={`inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 text-[17px] font-medium text-ink-900 hover:bg-primary-400 disabled:opacity-50 ${focusRing}`}
            >
              <Play aria-hidden size={20} strokeWidth={2} />
              Resume cooking
            </button>
          ) : step.isLast ? (
            <button
              type="button"
              onClick={onFinish}
              disabled={busy}
              className={`inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 text-[17px] font-medium text-ink-900 hover:bg-primary-400 disabled:opacity-50 ${focusRing}`}
            >
              <Check aria-hidden size={20} strokeWidth={2.25} />
              Finish cooking
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              disabled={busy}
              className={`inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 text-[17px] font-medium text-ink-900 hover:bg-primary-400 disabled:opacity-50 ${focusRing}`}
            >
              Done, next step
              <ArrowRight aria-hidden size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
