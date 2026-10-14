"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Timer display foundation. Display + controls only —
 * countdown math lives in cooking-session (Phase 1).
 * Flat dark surface on purpose: readable under kitchen glare.
 */
export function TimerDisplay({
  seconds,
  running,
  label = "Timer",
  onToggle,
  onReset,
}: {
  seconds: number;
  running: boolean;
  label?: string;
  onToggle?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-ink-900 py-4 pl-6 pr-4 text-white">
      <div className="flex flex-col">
        <span className="text-[13px] text-white/70">{label}</span>
        <output
          aria-live="polite"
          aria-label={`${label}: ${formatClock(seconds)}${running ? ", running" : ", paused"}`}
          className="tnum text-[34px] font-semibold leading-10 tracking-tight"
        >
          {formatClock(seconds)}
        </output>
      </div>
      <div className="flex items-center gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            aria-label="Reset timer"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <RotateCcw aria-hidden size={18} />
          </button>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={running ? "Pause timer" : "Start timer"}
            className="inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-primary-500 px-5 font-medium text-ink-900 hover:bg-primary-400"
          >
            {running ? <Pause aria-hidden size={18} /> : <Play aria-hidden size={18} />}
            <span className="text-[15px]">{running ? "Pause" : "Start"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
