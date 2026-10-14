"use client";

import {
  AlertTriangle,
  Check,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  DEFAULT_PREFS,
  createReadAloud,
  listVoices,
  loadReadAloudPrefs,
  onVoicesChanged,
  saveReadAloudPrefs,
  speechApi,
  voicesFor,
  type ReadAloud as Controller,
  type ReadAloudPrefs,
  type ReadAloudState,
  type ReadAloudStatus,
  type ReadRequest,
  type VoiceLike,
} from "./read-aloud";

const btn = `inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white/10 px-5 text-[1rem] font-medium text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-40`;

function statusLine(state: ReadAloudState, stepNumber: number, readKey?: string) {
  // Voice answers (Phase 30) use their own keys; don't call them "step N".
  const isStep = !readKey || state.key === null || state.key === readKey;
  switch (state.status) {
    case "starting":
      return { icon: <Volume2 size={16} strokeWidth={1.75} />, text: "Starting…" };
    case "playing":
      return {
        icon: <Volume2 size={16} strokeWidth={1.75} />,
        text: isStep ? `Reading step ${stepNumber} aloud` : "Reading aloud",
      };
    case "paused":
      return { icon: <Pause size={16} strokeWidth={1.75} />, text: "Paused" };
    case "stopped":
      return { icon: <Square size={16} strokeWidth={1.75} />, text: "Stopped" };
    case "done":
      return {
        icon: <Check size={16} strokeWidth={1.75} />,
        text: isStep ? `Finished reading step ${stepNumber}` : "Finished reading",
      };
    case "error":
      return {
        icon: <AlertTriangle size={16} strokeWidth={1.75} />,
        text: state.message ?? "Couldn't read this step aloud.",
      };
    default:
      return null;
  }
}

export interface ReadAloudBarProps {
  /** Null until the browser has been checked (first client render). */
  state: ReadAloudState | null;
  stepNumber: number;
  /** Key of the current step's reading, to tell it apart from voice answers. */
  readKey?: string;
  /** The step has something to read. */
  hasContent: boolean;
  auto: boolean;
  /** Voices for the recipe's language; empty hides the picker. */
  voices: VoiceLike[];
  voiceURI: string | null;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReplay: () => void;
  onToggleAuto: () => void;
  onVoice: (voiceURI: string | null) => void;
}

/**
 * Read-aloud controls for the current step. Secondary to the
 * instruction: quiet pills, one row. Status is always icon + text, in
 * one polite live region that names the state, never the instruction.
 * No animation (the design system allows colour transitions only).
 */
export function ReadAloudBar({
  state,
  stepNumber,
  readKey,
  hasContent,
  auto,
  voices,
  voiceURI,
  onPlay,
  onPause,
  onResume,
  onStop,
  onReplay,
  onToggleAuto,
  onVoice,
}: ReadAloudBarProps) {
  // Keeps the layout steady while the browser is checked.
  if (!state) return <div aria-hidden className="min-h-[52px]" />;

  if (state.status === "unsupported") {
    return (
      <p className="inline-flex items-start gap-2 text-[0.875rem] leading-5 text-white/60">
        <VolumeX aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        Read-aloud isn&apos;t available in this browser. The step stays on screen.
      </p>
    );
  }

  const active =
    state.status === "starting" || state.status === "playing" || state.status === "paused";
  const line = statusLine(state, stepNumber, readKey);

  return (
    <section aria-label="Read aloud" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {state.status === "paused" ? (
          <button type="button" className={btn} onClick={onResume} aria-label="Resume reading">
            <Play aria-hidden size={18} strokeWidth={1.75} />
            Resume
          </button>
        ) : active ? (
          <button type="button" className={btn} onClick={onPause} aria-label="Pause reading">
            <Pause aria-hidden size={18} strokeWidth={1.75} />
            Pause
          </button>
        ) : (
          <button type="button" className={btn} onClick={onPlay} disabled={!hasContent}>
            <Volume2 aria-hidden size={18} strokeWidth={1.75} />
            Read this step
          </button>
        )}
        {active && (
          <>
            <button type="button" className={btn} onClick={onReplay} aria-label="Replay this step">
              <RotateCcw aria-hidden size={18} strokeWidth={1.75} />
              Replay
            </button>
            <button type="button" className={btn} onClick={onStop} aria-label="Stop reading">
              <Square aria-hidden size={18} strokeWidth={1.75} />
              Stop
            </button>
          </>
        )}
        <button type="button" className={btn} aria-pressed={auto} onClick={onToggleAuto}>
          {auto ? (
            <Check aria-hidden size={18} strokeWidth={2} />
          ) : (
            <span aria-hidden className="h-[18px] w-[18px] rounded-full border-2 border-white/40" />
          )}
          Auto-read steps
          <span aria-hidden className="text-white/60">
            {auto ? "On" : "Off"}
          </span>
        </button>
      </div>

      <p
        role="status"
        className="inline-flex items-start gap-2 text-[0.875rem] leading-5 text-white/70"
      >
        {line && (
          <>
            <span aria-hidden className="mt-0.5 shrink-0">
              {line.icon}
            </span>
            {line.text}
          </>
        )}
        {!line && !hasContent && "There's nothing to read for this step."}
      </p>

      {voices.length > 0 && (
        <details className="group text-[0.875rem] text-white/70">
          <summary
            className={`inline-flex min-h-[44px] cursor-pointer list-none items-center rounded-full px-1 underline-offset-4 hover:underline`}
          >
            Voice: {voices.find((v) => v.voiceURI === voiceURI)?.name ?? "Device default"}
          </summary>
          <label className="mt-2 flex flex-col gap-1.5">
            <span>Choose a voice</span>
            <select
              value={voiceURI ?? ""}
              onChange={(e) => onVoice(e.target.value || null)}
              style={{ colorScheme: "dark" }}
              className={`min-h-[52px] w-full max-w-md rounded-full bg-white/10 px-4 text-[1rem] text-white`}
            >
              <option value="">Device default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <span className="text-[0.8125rem] leading-5 text-white/50">
              Voices come from your device, so what&apos;s listed and how names are pronounced
              varies.
            </span>
          </label>
        </details>
      )}
    </section>
  );
}

/**
 * Read-aloud for the current Cooking Mode step. Owns one speech
 * controller for as long as Cooking Mode is on screen: a step change
 * silences the previous step (and reads the new one if auto-read is
 * on), pausing the session stops speech, and leaving the page or
 * unmounting cancels everything.
 */
/**
 * What voice commands (Phase 30) can ask of read-aloud. Uses the same
 * controller as the buttons, so there's only ever one voice talking.
 */
export interface ReadAloudHandle {
  status(): ReadAloudStatus;
  /** "Repeat that": the current step from the top. */
  replayStep(): void;
  /** Read something other than the current step (an answer, the next step). */
  say(segments: string[]): void;
  pause(): void;
  resume(): void;
  stop(): void;
  /** Read the step that's about to be shown, even with auto-read off. */
  readOnNextStep(): void;
}

let sayCount = 0;

export function ReadAloud({
  readKey,
  segments,
  stepNumber,
  lang,
  paused,
  handleRef,
}: {
  /** Identifies what's being read (session + step). */
  readKey: string;
  segments: string[];
  stepNumber: number;
  lang: string | null;
  paused: boolean;
  handleRef?: Ref<ReadAloudHandle>;
}) {
  const controller = useRef<Controller | null>(null);
  const [state, setState] = useState<ReadAloudState | null>(null);
  const [prefs, setPrefs] = useState<ReadAloudPrefs>(DEFAULT_PREFS);
  const [allVoices, setAllVoices] = useState<VoiceLike[]>([]);

  const voices = voicesFor(allVoices, lang);
  const voice = voices.find((v) => v.voiceURI === prefs.voiceURI) ?? null;
  const request: ReadRequest = { key: readKey, segments, lang, voice };
  const latest = useRef({ request, prefs, paused });
  latest.current = { request, prefs, paused };
  /** When a voice command asked for the next step to be read (expires: the move may fail). */
  const readArrival = useRef(0);

  useImperativeHandle(
    handleRef,
    () => ({
      status: () => controller.current?.getState().status ?? "unsupported",
      replayStep: () => controller.current?.replay(latest.current.request),
      say: (pieces) => {
        const r = latest.current.request;
        controller.current?.replay({ ...r, key: `voice:${++sayCount}`, segments: pieces });
      },
      pause: () => controller.current?.pause(),
      resume: () => controller.current?.resume(),
      stop: () => controller.current?.stop(),
      readOnNextStep: () => {
        readArrival.current = Date.now();
      },
    }),
    [],
  );

  useEffect(() => {
    const api = speechApi();
    const c = createReadAloud(api);
    controller.current = c;
    setState(c.getState());
    const unsubscribe = c.subscribe(setState);
    setPrefs(loadReadAloudPrefs());
    const refreshVoices = () => setAllVoices(listVoices(api));
    refreshVoices();
    const offVoices = onVoicesChanged(api, refreshVoices);
    // bfcache / tab close may skip unmount; never keep talking after leaving.
    const onHide = () => c.stop();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      offVoices();
      unsubscribe();
      c.dispose();
      controller.current = null;
    };
  }, []);

  // New step: silence the old one; read the new one if auto-read is on.
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    const previous = lastKey.current;
    lastKey.current = readKey;
    const c = controller.current;
    if (!c || previous === null || previous === readKey) return;
    c.reset();
    const { request: r, prefs: p, paused: isPaused } = latest.current;
    const asked = Date.now() - readArrival.current < 4_000;
    readArrival.current = 0;
    if ((p.auto || asked) && !isPaused && r.segments.length > 0) c.play(r);
  }, [readKey]);

  useEffect(() => {
    if (paused) controller.current?.stop();
  }, [paused]);

  const updatePrefs = (next: ReadAloudPrefs) => {
    setPrefs(next);
    saveReadAloudPrefs(next);
  };

  return (
    <ReadAloudBar
      state={state}
      stepNumber={stepNumber}
      readKey={readKey}
      hasContent={segments.length > 0}
      auto={prefs.auto}
      voices={voices}
      voiceURI={voice?.voiceURI ?? null}
      onPlay={() => controller.current?.play(latest.current.request)}
      onPause={() => controller.current?.pause()}
      onResume={() => controller.current?.resume()}
      onStop={() => controller.current?.stop()}
      onReplay={() => controller.current?.replay(latest.current.request)}
      onToggleAuto={() => updatePrefs({ ...prefs, auto: !prefs.auto })}
      onVoice={(voiceURI) => {
        updatePrefs({ ...prefs, voiceURI });
        // A new voice applies from the next reading; don't keep the old one talking.
        controller.current?.stop();
      }}
    />
  );
}
