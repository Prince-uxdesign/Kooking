"use client";

import {
  Bell,
  BellOff,
  Pause,
  Play,
  RotateCcw,
  Timer as TimerIcon,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  describeDuration,
  formatRemaining,
  remainingMs,
  type SessionTimer,
  type TimerAction,
} from "@/shared/domain/timers";
import type { NotificationState } from "./timer-alerts";

const ring =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900";
const big = `inline-flex min-h-[56px] items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[17px] font-medium transition-colors ${ring}`;
const primaryBtn = `${big} bg-primary-500 text-ink-900 hover:bg-primary-400`;
const quietBtn = `${big} bg-white/10 text-white hover:bg-white/20`;
const smallBtn = `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white hover:bg-white/20 ${ring}`;

const timerName = (t: SessionTimer) => t.label ?? "Timer";

function finishedAgo(t: SessionTimer, now: number): string {
  if (t.finishedAt === null) return "just now";
  const mins = Math.floor((now - t.finishedAt) / 60_000);
  if (mins < 1) return "just now";
  return `${mins} min ago`;
}

/** The current step's timer: big readable time, one obvious control. */
export function StepTimerCard({
  timer,
  now,
  readyCue,
  onAction,
  alertControls,
}: {
  timer: SessionTimer;
  now: number;
  /** The recipe's own doneness cue, repeated when time is up. */
  readyCue: string | null;
  onAction: (action: TimerAction) => void;
  alertControls?: React.ReactNode;
}) {
  const left = remainingMs(timer, now);
  const name = timerName(timer);
  const done = timer.status === "done";

  return (
    <section
      aria-labelledby={`timer-${timer.id}`}
      className={`flex flex-col gap-4 rounded-3xl p-5 ${done ? "bg-primary-500 text-ink-900" : "bg-white/5 text-white"}`}
    >
      <h3
        id={`timer-${timer.id}`}
        className={`inline-flex items-center gap-2 text-[15px] font-medium ${done ? "text-ink-900" : "text-white/70"}`}
      >
        <TimerIcon aria-hidden size={18} strokeWidth={1.75} />
        {name}
        <span className="font-normal">· {describeDuration(timer.durationSeconds)}</span>
      </h3>

      {done ? (
        <div role="status" className="flex flex-col gap-1">
          <p className="text-[28px] font-semibold leading-9">Time&apos;s up</p>
          <p className="text-[15px] leading-6">
            Finished {finishedAgo(timer, now)}. The timer is a guide, not a sign it&apos;s ready.
            {readyCue ? ` Check: ${readyCue}` : " Check the pot before moving on."}
          </p>
        </div>
      ) : (
        <p className="tnum text-[48px] font-semibold leading-none sm:text-[56px]">
          <span aria-hidden>{formatRemaining(left)}</span>
          <span className="sr-only">
            {timer.status === "idle"
              ? `${describeDuration(timer.durationSeconds)}, not started`
              : `${describeDuration(Math.ceil(left / 1000))} left${timer.status === "paused" ? ", paused" : ""}`}
          </span>
          {timer.status === "paused" && (
            <span className="ml-3 align-middle text-[15px] font-medium text-white/70">Paused</span>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {timer.status === "idle" && (
          <button
            type="button"
            className={`${primaryBtn} flex-1`}
            onClick={() => onAction("start")}
          >
            <Play aria-hidden size={20} strokeWidth={2} />
            Start timer
          </button>
        )}
        {timer.status === "running" && (
          <button type="button" className={`${quietBtn} flex-1`} onClick={() => onAction("pause")}>
            <Pause aria-hidden size={20} strokeWidth={1.75} />
            Pause timer
          </button>
        )}
        {timer.status === "paused" && (
          <button
            type="button"
            className={`${primaryBtn} flex-1`}
            onClick={() => onAction("resume")}
          >
            <Play aria-hidden size={20} strokeWidth={2} />
            Resume timer
          </button>
        )}
        {(timer.status === "running" || timer.status === "paused") && (
          <button
            type="button"
            className={quietBtn}
            onClick={() => onAction("cancel")}
            aria-label={`Cancel ${name} timer`}
          >
            <X aria-hidden size={20} strokeWidth={1.75} />
            Cancel
          </button>
        )}
        {done && (
          <>
            {!timer.acknowledged && (
              <button
                type="button"
                className={`${big} flex-1 bg-ink-900 text-white hover:bg-ink-800`}
                onClick={() => onAction("acknowledge")}
              >
                OK, checking
              </button>
            )}
            <button
              type="button"
              className={`${big} bg-white/40 text-ink-900 hover:bg-white/60`}
              onClick={() => onAction("reset")}
            >
              <RotateCcw aria-hidden size={18} strokeWidth={1.75} />
              Reset
            </button>
          </>
        )}
      </div>
      {!done && alertControls}
    </section>
  );
}

/** Sound and background-alert controls, shown with a running timer. */
export function AlertControls({
  soundOn,
  soundAvailable,
  notifications,
  onToggleSound,
  onEnableNotifications,
}: {
  soundOn: boolean;
  soundAvailable: boolean;
  notifications: NotificationState;
  onToggleSound: () => void;
  onEnableNotifications: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-[14px] text-white/70">
      <div className="flex flex-wrap gap-2">
        {soundAvailable ? (
          <button type="button" className={smallBtn} aria-pressed={soundOn} onClick={onToggleSound}>
            {soundOn ? <Volume2 aria-hidden size={16} /> : <VolumeX aria-hidden size={16} />}
            {soundOn ? "Sound on" : "Sound off"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2">
            <VolumeX aria-hidden size={16} />
            Sound isn&apos;t available here. Watch for the on-screen alert.
          </span>
        )}
        {notifications === "default" && (
          <button type="button" className={smallBtn} onClick={onEnableNotifications}>
            <Bell aria-hidden size={16} />
            Alert me in the background
          </button>
        )}
      </div>
      {notifications === "denied" && (
        <p className="inline-flex items-start gap-2">
          <BellOff aria-hidden size={16} className="mt-0.5 shrink-0" />
          Background alerts are blocked in your browser settings. Keep Kooking open to see the
          timer.
        </p>
      )}
      <p className="text-[13px] leading-5 text-white/50">
        Timers keep counting if you leave this page. Alerts can&apos;t fire if the browser is closed
        or your phone stops it in the background, so check back when the time is close.
      </p>
    </div>
  );
}

/** Timers from other steps, pinned with the controls so they're never lost. */
export function OtherTimersBar({
  timers,
  now,
  stepNumberOf,
  onOpen,
}: {
  timers: SessionTimer[];
  now: number;
  stepNumberOf: (stepId: string) => number;
  onOpen: (stepId: string) => void;
}) {
  if (timers.length === 0) return null;
  return (
    <ul aria-label="Other timers" className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
      {timers.map((t) => {
        const done = t.status === "done";
        const text = done ? "Time's up" : formatRemaining(remainingMs(t, now));
        return (
          <li key={t.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onOpen(t.stepId)}
              aria-label={`${timerName(t)}, step ${stepNumberOf(t.stepId)}: ${
                done
                  ? "time's up"
                  : `${describeDuration(Math.ceil(remainingMs(t, now) / 1000))} left`
              }${t.status === "paused" ? ", paused" : ""}. Go to step.`}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] ${ring} ${
                done ? "bg-primary-500 text-ink-900" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <TimerIcon aria-hidden size={16} strokeWidth={1.75} />
              <span className="max-w-[10rem] truncate">{timerName(t)}</span>
              <span className="tnum font-medium">{text}</span>
              {t.status === "paused" && <Pause aria-hidden size={14} />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Unacknowledged finished timers from other steps. */
export function TimerAlertBanner({
  timers,
  stepNumberOf,
  onGoTo,
  onDismiss,
}: {
  timers: SessionTimer[];
  stepNumberOf: (stepId: string) => number;
  onGoTo: (stepId: string) => void;
  onDismiss: (timerId: string) => void;
}) {
  if (timers.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-2">
      {timers.map((t) => (
        <div
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-primary-500 p-4 text-ink-900"
        >
          <p className="text-[16px] font-medium">
            {timerName(t)} (step {stepNumberOf(t.stepId)}): time&apos;s up
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onGoTo(t.stepId)}
              className="min-h-[44px] rounded-full bg-ink-900 px-4 text-[14px] font-medium text-white hover:bg-ink-800"
            >
              Go to step
            </button>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="min-h-[44px] rounded-full bg-white/50 px-4 text-[14px] font-medium hover:bg-white/70"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
