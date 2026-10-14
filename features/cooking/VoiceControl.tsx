"use client";

import { AlertTriangle, Check, HelpCircle, Info, Mic, MicOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VOICE_HELP } from "@/shared/domain/voice-commands";
import {
  createVoiceListener,
  recognitionApi,
  type ListenState,
  type VoiceListener,
} from "./voice-recognition";

/** What happened to the last thing the cook said. Shown briefly; never stored. */
export type VoiceFeedback =
  | { tone: "recognized"; heard: string }
  | { tone: "done"; heard: string; text: string }
  | { tone: "clarify"; heard: string; text: string }
  /** Recognized, but not possible right now (explains why). */
  | { tone: "info"; heard: string; text: string }
  | { tone: "not-understood"; heard: string; text: string };

/* ------------------------------------------------------------------ */
/* Hook                                                               */
/* ------------------------------------------------------------------ */

function recognitionLang(): string | null {
  if (typeof document === "undefined") return null;
  const page = document.documentElement.lang || "en";
  const nav = typeof navigator !== "undefined" ? navigator.language : "";
  // Prefer the device's regional variant (e.g. en-NG) of the page language.
  return nav && nav.toLowerCase().startsWith(page.toLowerCase()) ? nav : page;
}

/**
 * Owns one voice listener for as long as Cooking Mode is mounted. The
 * microphone is never touched until `start()` runs from a button press.
 * Listening stops when the page is hidden or left, and on unmount.
 */
export function useVoiceCommands(onPhrase: (alternatives: string[]) => void, enabled: boolean) {
  const listener = useRef<VoiceListener | null>(null);
  const [state, setState] = useState<ListenState | null>(null);
  const handler = useRef(onPhrase);
  handler.current = onPhrase;

  useEffect(() => {
    const l = createVoiceListener(recognitionApi(), {
      lang: recognitionLang(),
      onPhrase: (alts) => handler.current(alts),
    });
    listener.current = l;
    setState(l.getState());
    const unsubscribe = l.subscribe(setState);
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        l.stop("Stopped listening because Kooking went to the background.");
      }
    };
    const onPageHide = () => l.stop();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      unsubscribe();
      l.dispose();
      listener.current = null;
    };
  }, []);

  // Leaving the cooking view (finished, ended, not found) turns the mic off.
  useEffect(() => {
    if (!enabled) listener.current?.stop();
  }, [enabled]);

  const start = useCallback(() => listener.current?.start(), []);
  const stop = useCallback((message?: string) => listener.current?.stop(message ?? null), []);
  return { state, start, stop };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

const isOn = (s: ListenState | null) => s?.status === "listening" || s?.status === "requesting";

/** Whether the pinned status row has anything to say. */
export function voiceStatusVisible(state: ListenState | null, feedback: VoiceFeedback | null) {
  if (!state || state.status === "unsupported") return false;
  return (
    isOn(state) ||
    state.status === "denied" ||
    state.status === "error" ||
    Boolean(state.message || feedback)
  );
}

/** Round mic button for the fixed step controls. Hidden when voice isn't available. */
export function MicButton({
  state,
  onStart,
  onStop,
}: {
  state: ListenState | null;
  onStart: () => void;
  onStop: () => void;
}) {
  if (!state || state.status === "unsupported") return null;
  const on = isOn(state);
  return (
    <button
      type="button"
      onClick={on ? onStop : onStart}
      aria-pressed={on}
      aria-label={on ? "Stop listening" : "Start voice commands"}
      title={on ? "Stop listening" : "Voice commands"}
      className={`inline-flex min-h-[56px] min-w-[56px] shrink-0 items-center justify-center rounded-full transition-colors ${
        on ? "bg-white text-ink-900 hover:bg-white/90" : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {/* Same icon both ways: the white fill, aria-pressed and the "Mic on" text carry the state. */}
      <Mic aria-hidden size={22} strokeWidth={on ? 2.25 : 1.75} />
    </button>
  );
}

function feedbackLine(f: VoiceFeedback) {
  switch (f.tone) {
    case "recognized":
      return { icon: <Check size={16} strokeWidth={1.75} />, text: "Got it…" };
    case "done":
      return { icon: <Check size={16} strokeWidth={2} />, text: f.text };
    case "clarify":
      return { icon: <HelpCircle size={16} strokeWidth={1.75} />, text: f.text };
    case "info":
      return { icon: <Info size={16} strokeWidth={1.75} />, text: f.text };
    case "not-understood":
      return { icon: <X size={16} strokeWidth={1.75} />, text: f.text };
  }
}

/**
 * Status row pinned above the step controls while voice is in use:
 * whether the mic is on, what was heard, and what happened. Always
 * text + icon; the "mic on" state is never shown by colour alone.
 */
export function VoiceStatus({
  state,
  feedback,
  onStop,
  onRetry,
}: {
  state: ListenState | null;
  feedback: VoiceFeedback | null;
  onStop: () => void;
  onRetry: () => void;
}) {
  if (!state || !voiceStatusVisible(state, feedback)) return null;
  const on = isOn(state);
  const problem = state.status === "denied" || state.status === "error";

  const line = feedback ? feedbackLine(feedback) : null;

  return (
    <div className="flex flex-col gap-2 pb-1">
      <div className="flex items-center justify-between gap-3">
        <p
          role="status"
          className="inline-flex min-w-0 items-start gap-2 text-[0.9375rem] leading-6 text-white"
        >
          {state.status === "requesting" ? (
            <>
              <Mic aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>Starting the mic… allow access if your browser asks.</span>
            </>
          ) : state.status === "listening" ? (
            <>
              <Mic aria-hidden size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
              <span>
                <span className="font-medium">Mic on · Listening</span>
                <span className="hidden text-white/60 sm:inline"> · say “next step”</span>
              </span>
            </>
          ) : problem ? (
            <>
              <AlertTriangle aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>{state.message}</span>
            </>
          ) : state.message ? (
            <>
              <MicOff aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span className="text-white/80">{state.message}</span>
            </>
          ) : (
            <>
              <MicOff aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span className="text-white/80">Mic off</span>
            </>
          )}
        </p>
        {on ? (
          <button
            type="button"
            onClick={onStop}
            className={`inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[0.9375rem] font-medium text-ink-900 hover:bg-white/90`}
          >
            <MicOff aria-hidden size={18} strokeWidth={2} />
            Stop
          </button>
        ) : problem ? (
          <button
            type="button"
            onClick={onRetry}
            className={`inline-flex min-h-[48px] shrink-0 items-center rounded-full bg-white/10 px-4 text-[0.9375rem] font-medium text-white hover:bg-white/20`}
          >
            Try again
          </button>
        ) : null}
      </div>
      {line && (
        <p
          aria-live="polite"
          className="inline-flex min-w-0 items-start gap-2 text-[0.875rem] leading-5 text-white/80"
        >
          <span aria-hidden className="mt-0.5 shrink-0">
            {line.icon}
          </span>
          <span className="min-w-0 break-words">
            <span className="text-white/50">“{feedback!.heard}” · </span>
            {line.text}
          </span>
        </p>
      )}
    </div>
  );
}

/**
 * In-page explainer: what you can say, and what happens to your voice.
 * When the browser can't recognize speech, says so in one line.
 */
export function VoiceHelp({ state }: { state: ListenState | null }) {
  if (!state) return null;
  if (state.status === "unsupported") {
    return (
      <p className="inline-flex items-start gap-2 text-[0.875rem] leading-5 text-white/60">
        <MicOff aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        Voice commands aren&apos;t available in this browser. Every action works with the buttons.
      </p>
    );
  }
  return (
    <details className="text-[0.875rem] text-white/70">
      <summary
        className={`inline-flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-full px-1 underline-offset-4 hover:underline`}
      >
        <Mic aria-hidden size={16} strokeWidth={1.75} />
        Voice commands: what you can say
      </summary>
      <div className="mt-2 flex flex-col gap-3 rounded-3xl bg-white/5 p-5">
        <dl className="flex flex-col gap-2">
          {VOICE_HELP.map((h) => (
            <div key={h.say} className="flex flex-col sm:flex-row sm:gap-3">
              <dt className="font-medium text-white sm:w-56 sm:shrink-0">“{h.say}”</dt>
              <dd className="text-white/70">{h.does}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[0.8125rem] leading-5 text-white/60">
          Tap the mic to start. It stays on until you stop it, leave this page, or say nothing for 2
          minutes. Your browser turns speech into text, and some browsers do that on their own
          online service, so it may not work offline. Kooking doesn&apos;t record audio or keep what
          you say.
        </p>
      </div>
    </details>
  );
}
