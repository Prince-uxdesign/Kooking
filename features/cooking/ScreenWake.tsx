"use client";

import { Monitor, MonitorOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScreenWake,
  screenWakePreference,
  setScreenWakePreference,
  shouldHoldWakeLock,
  wakeLockApi,
  type ScreenWake,
  type WakeState,
} from "./screen-wake";

/**
 * Owns one wake lock for as long as Cooking Mode is mounted. `sessionStatus`
 * is null whenever there's no live session on screen (loading, finished,
 * not found), so the lock is released as soon as cooking ends.
 */
export function useScreenWake(
  sessionStatus: "active" | "paused" | "completed" | "abandoned" | null,
) {
  const controller = useRef<ScreenWake | null>(null);
  const [state, setState] = useState<WakeState | null>(null);
  /** null until the stored preference has been read (nothing is requested before then). */
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const c = createScreenWake(wakeLockApi());
    controller.current = c;
    setState(c.getState());
    const unsubscribe = c.subscribe(setState);
    setEnabled(screenWakePreference());
    const onChange = () => c.pageVisibilityChanged();
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("pageshow", onChange);
    window.addEventListener("pagehide", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("pageshow", onChange);
      window.removeEventListener("pagehide", onChange);
      unsubscribe();
      c.dispose();
      controller.current = null;
    };
  }, []);

  const hold = shouldHoldWakeLock({ preference: enabled, sessionStatus });
  useEffect(() => {
    controller.current?.setWanted(hold);
  }, [hold]);

  const toggle = useCallback(() => {
    setEnabled((on) => {
      const next = !(on ?? true);
      setScreenWakePreference(next);
      return next;
    });
  }, []);
  const retry = useCallback(() => controller.current?.retry(), []);
  return { state, enabled, toggle, retry };
}

export interface ScreenWakeControlProps {
  state: WakeState | null;
  enabled: boolean | null;
  /** Cooking is paused: the lock is released until it resumes. */
  sessionPaused: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

/** What the control says for each situation. Pure, for tests. */
export function wakeNote(p: ScreenWakeControlProps): { text: string; retry: boolean } | null {
  const { state, enabled } = p;
  if (!state || enabled === null) return null;
  if (state.status === "unsupported") {
    return {
      text: "This browser can't keep the screen on, so it may dim while you cook. Tap the screen to wake it.",
      retry: false,
    };
  }
  if (!enabled) return null;
  if (p.sessionPaused)
    return { text: "The screen can sleep while cooking is paused.", retry: false };
  switch (state.status) {
    case "requesting":
      return { text: "Keeping the screen on…", retry: false };
    case "on":
      return {
        text: state.recovered
          ? "Screen is staying on again."
          : "Screen stays on while you cook. Battery saver or device settings can still override this.",
        retry: false,
      };
    case "unavailable":
      return {
        text:
          state.message ??
          "Paused while Kooking is in the background. It will come back when you return.",
        retry: Boolean(state.message),
      };
    default:
      return null;
  }
}

/**
 * Compact "Keep screen on" switch for the top of Cooking Mode. The
 * switch shows the cook's choice (On/Off in words, aria-pressed); the
 * line under it says what's actually happening. Unsupported browsers get
 * the explanation only, never a dead control.
 */
export function ScreenWakeControl(props: ScreenWakeControlProps) {
  const { state, enabled, onToggle, onRetry } = props;
  if (!state || enabled === null) return <div aria-hidden className="min-h-[44px]" />;
  const note = wakeNote(props);

  if (state.status === "unsupported") {
    return (
      <p className="inline-flex items-start gap-2 text-[0.8125rem] leading-5 text-white/60">
        <MonitorOff aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        {note?.text}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        aria-pressed={enabled}
        onClick={onToggle}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/10 px-4 text-[0.875rem] font-medium text-white transition-colors hover:bg-white/20`}
      >
        {enabled ? (
          <Monitor aria-hidden size={18} strokeWidth={1.75} />
        ) : (
          <MonitorOff aria-hidden size={18} strokeWidth={1.75} />
        )}
        Keep screen on
        <span aria-hidden className="text-white/60">
          {enabled ? "On" : "Off"}
        </span>
      </button>
      <div className="flex min-h-[20px] flex-wrap items-center gap-x-3 gap-y-1">
        <p role="status" className="text-[0.8125rem] leading-5 text-white/60">
          {note?.text}
        </p>
        {note?.retry && (
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex min-h-[44px] items-center rounded-full px-3 text-[0.8125rem] font-medium text-white underline underline-offset-4 hover:bg-white/10`}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
