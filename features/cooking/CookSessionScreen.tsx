"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocalCookingHistory, LocalSessions } from "@/shared/data/local";
import { sessionToHistoryEntry } from "@/shared/domain/cooking-history";
import { getRemoteSyncService } from "@/shared/data/remote-sync";
import { useOptionalAuth } from "@/features/auth/AuthContext";
import {
  advanceStep,
  checkFinish,
  completionSummary,
  finishCooking,
  previousStep,
  progressSummary,
  resolveSession,
  stepDisplay,
  type FinishCheck,
  type CatalogEntry,
  type SessionView,
} from "@/shared/domain/cooking-session";
import { kitchenCheckHref } from "@/shared/domain/navigation";
import {
  SessionTransitionError,
  applySessionTimer,
  goToStep,
  settleSessionTimers,
  transitionSession,
  type CookingSession,
} from "@/shared/domain/session";
import {
  TimerError,
  isExpired,
  nextExpiry,
  pendingAlerts,
  type TimerAction,
} from "@/shared/domain/timers";
import {
  createChime,
  notificationState,
  notifyTimerDone,
  requestNotifications,
  setSoundPreference,
  soundPreference,
  vibrate,
  type Chime,
  type NotificationState,
} from "./timer-alerts";
import { AlertControls, OtherTimersBar, StepTimerCard, TimerAlertBanner } from "./TimerViews";
import { createTimerClock, type TimerClock } from "./timer-clock";
import { isNewerThan, salvageSession } from "@/shared/domain/recovery";
import { CompletionScreen } from "./CompletionScreen";
import { SessionStatus, useOnlineStatus } from "./SessionStatus";
import { CookingStep } from "./CookingStep";
import { FinishPrompt } from "./FinishPrompt";
import { ReadAloud, type ReadAloudHandle } from "./ReadAloud";
import { stepSpeech } from "@/shared/domain/step-speech";
import { addSessionTimer, stepTimerFor } from "@/shared/domain/session";
import { commandKey, parseAlternatives } from "@/shared/domain/voice-commands";
import { planVoiceCommand } from "@/shared/domain/voice-plan";
import { createDeduper } from "./voice-recognition";
import { ScreenWakeControl, useScreenWake } from "./ScreenWake";
import {
  MicButton,
  VoiceHelp,
  VoiceStatus,
  useVoiceCommands,
  voiceStatusVisible,
  type VoiceFeedback,
} from "./VoiceControl";

const sessions = new LocalSessions();

const pill =
  "inline-flex min-h-[56px] items-center justify-center rounded-full px-6 text-[1rem] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";
const primary = `${pill} bg-primary-500 text-ink-900 hover:bg-primary-400`;
const quiet = `${pill} bg-white/10 text-white hover:bg-white/20`;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-[32px] bg-white/5 p-6 sm:p-8">
      <h1 className="text-[1.75rem] font-semibold leading-9 text-white">{title}</h1>
      {children}
    </section>
  );
}

/**
 * Cooking Mode. Loads the stored session, resolves it safely, and offers
 * only the transitions the lifecycle allows. Storage is the source of
 * truth (Phase 28): the screen re-reads it when another tab changes it or
 * the page becomes visible, never overwrites newer progress, and says
 * plainly when a save fails.
 */
export function CookSessionScreen({
  sessionId,
  catalog,
}: {
  sessionId: string;
  catalog: Record<string, CatalogEntry>;
}) {
  const [view, setView] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Raw stored entry when it failed validation, for salvage. */
  const [damagedRaw, setDamagedRaw] = useState<unknown>(null);
  /** Last save attempt failed: what's on screen may not be on disk. */
  const [saveFailed, setSaveFailed] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const online = useOnlineStatus();
  const auth = useOptionalAuth();
  const userId = auth?.user?.id ?? null;
  const [busy, setBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStep = useRef<number | null>(null);

  // Timers
  const session = view && "session" in view ? view.session : null;
  const timers = session?.timers ?? [];
  const clockRef = useRef<TimerClock | null>(null);
  clockRef.current ??= createTimerClock();
  const clock = clockRef.current;
  const chime = useRef<Chime | null>(null);
  chime.current ??= createChime();
  const [soundOn, setSoundOn] = useState(true);
  const [soundAvailable, setSoundAvailable] = useState(true);
  const [notifications, setNotifications] = useState<NotificationState>("unsupported");
  const alerted = useRef(new Set<string>());
  const [finishCheck, setFinishCheck] = useState<FinishCheck | null>(null);
  const [justFinished, setJustFinished] = useState(false);

  useEffect(() => {
    setSoundOn(soundPreference());
    setSoundAvailable(chime.current!.available());
    setNotifications(notificationState());
  }, []);

  // Load (and re-load) the session from storage. Used on mount, when
  // another tab changes it, and when the page becomes visible again.
  const [syncNotice, setNotice] = useState<string | null>(null);
  const viewRef = useRef<SessionView | null>(null);
  viewRef.current = view;
  const loadFromStorage = useCallback(
    async (reason: "mount" | "sync") => {
      let raw: unknown;
      try {
        raw = await sessions.getRaw(sessionId);
      } catch {
        if (reason === "mount") setView({ kind: "corrupt" });
        return;
      }
      const current = viewRef.current;
      if (
        reason === "sync" &&
        current &&
        "session" in current &&
        !isNewerThan(raw, current.session)
      ) {
        return; // nothing newer elsewhere
      }
      const resolved = resolveSession(raw, catalog, Date.now());
      setDamagedRaw(resolved.kind === "corrupt" ? raw : null);
      // Persist a repaired step index so the fix survives the next refresh.
      if (resolved.kind === "cooking" && resolved.stepRepaired) {
        await sessions.store(resolved.session).catch(() => setSaveFailed(true));
      }
      if (reason === "sync" && current && "session" in current) {
        setError(null);
        setNotice("Updated with progress from another tab or window.");
      }
      setView(resolved);
    },
    [sessionId, catalog],
  );
  useEffect(() => {
    void loadFromStorage("mount");
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("kooking:sessions")) void loadFromStorage("sync");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadFromStorage("sync");
    };
    const onShow = () => void loadFromStorage("sync");
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onShow);
    };
  }, [loadFromStorage]);

  /** Synchronous guard: `busy` state can be stale between a call and the next render. */
  const inFlight = useRef(false);
  /** Resolves true only when the change was applied and saved. */
  const apply = useCallback(
    async (update: (s: CookingSession) => CookingSession): Promise<boolean> => {
      if (!view || !("session" in view) || busy || inFlight.current) return false;
      inFlight.current = true;
      setBusy(true);
      try {
        // Never overwrite progress made in another tab: adopt it instead.
        const stored = await sessions.getRaw(view.session.id).catch(() => null);
        if (isNewerThan(stored, view.session)) {
          setView(resolveSession(stored, catalog, Date.now()));
          setError("This session changed in another tab or window. Showing the latest; try again.");
          return false;
        }
        const next = update(view.session);
        try {
          await sessions.store(next);
          if (next.status === "completed" || next.status === "abandoned") {
            const history = new LocalCookingHistory();
            const entry = sessionToHistoryEntry(next, { userId });
            void history.record(entry);
            if (userId) {
              void getRemoteSyncService().recordCookingHistory(userId, entry);
            }
          }
        } catch {
          // Nothing on screen changes: the last saved state is what's shown.
          setSaveFailed(true);
          setError(null);
          return false;
        }
        setSaveFailed(false);
        setError(null);
        setNotice(null);
        setView(resolveSession(next, catalog, Date.now()));
        return true;
      } catch (e) {
        setError(
          e instanceof SessionTransitionError || e instanceof TimerError
            ? "That action isn't available right now."
            : "Something went wrong. Your last saved progress is unchanged.",
        );
        return false;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [view, catalog, busy, userId],
  );

  // Settle timers that ran out. Re-anchors to wall clock on visibility changes
  // and schedules precise wake up at the next timer expiration.
  useEffect(() => {
    const settle = () => {
      const currentTime = Date.now();
      if (!session || !timers.some((t) => isExpired(t, currentTime))) return;
      const { session: settled } = settleSessionTimers(session, currentTime);
      setView(resolveSession(settled, catalog, currentTime));
      void sessions
        .getRaw(settled.id)
        .then(async (stored) => {
          if (isNewerThan(stored, settled)) return loadFromStorage("sync");
          await sessions.store(settled);
          setSaveFailed(false);
        })
        .catch(() => setSaveFailed(true));
    };

    settle();

    const next = nextExpiry(timers);
    if (next === null) return;
    const delay = Math.max(0, next - Date.now()) + 50;
    const timerId = window.setTimeout(settle, delay);
    return () => window.clearTimeout(timerId);
  }, [timers, session, catalog, loadFromStorage]);

  // Alert once per finished timer, only if it finished in the last minute
  // (a timer that ran out long ago is shown on screen, not sounded).
  useEffect(() => {
    const currentTime = Date.now();
    for (const t of pendingAlerts(timers)) {
      if (alerted.current.has(t.id)) continue;
      alerted.current.add(t.id);
      if (t.finishedAt === null || currentTime - t.finishedAt > 60_000) continue;
      if (soundOn) chime.current?.play();
      vibrate();
      notifyTimerDone(t.label ?? "Timer", document.visibilityState === "hidden");
    }
    // A reset/cancelled timer may alert again on its next run.
    for (const id of alerted.current) {
      const t = timers.find((x) => x.id === id);
      if (!t || t.status !== "done") alerted.current.delete(id);
    }
  }, [timers, soundOn]);

  const timerAction = (timerId: string, action: TimerAction) => {
    // Start/resume is a user gesture: the moment browsers allow audio.
    if (action === "start" || action === "resume") chime.current?.unlock();
    void apply((s) => applySessionTimer(s, timerId, action, clock.now()));
  };

  // Voice commands (Phase 30). Every command goes through the same
  // `apply` and read-aloud controller as the buttons; nothing here is a
  // second state machine. Transcripts are shown briefly and never saved.
  const readAloud = useRef<ReadAloudHandle>(null);
  const [voiceFeedback, setVoiceFeedback] = useState<VoiceFeedback | null>(null);
  const dedupe = useRef(createDeduper());
  const stopListening = useRef<(message?: string) => void>(() => {});
  const handlePhrase = async (alternatives: string[]) => {
    if (view?.kind !== "cooking") return;
    const heard = alternatives[0];
    const speech = readAloud.current?.status() ?? "unsupported";
    const speaking = speech === "starting" || speech === "playing";
    // Spoken feedback never talks over a reading (the cook may be listening to it).
    const say = (text: string) => {
      if (speech !== "unsupported" && !speaking) readAloud.current?.say([text]);
    };
    const parsed = parseAlternatives(alternatives);
    if (!parsed.ok) {
      // While Kooking is talking, the mic hears it; only real commands count then.
      if (parsed.reason === "empty" || speaking) return;
      if (parsed.reason === "unrecognized") {
        setVoiceFeedback({ tone: "not-understood", heard, text: parsed.message });
        return;
      }
      setVoiceFeedback({ tone: "clarify", heard, text: parsed.message });
      say(parsed.message);
      return;
    }
    // The same command heard twice in a moment runs once ("next step" never moves two).
    if (!dedupe.current(commandKey(parsed.command))) return;

    const plan = planVoiceCommand(parsed.command, {
      session: view.session,
      now: clock.now(),
      speech,
    });
    const done = (text: string) => setVoiceFeedback({ tone: "done", heard, text });
    const failed = () =>
      setVoiceFeedback({
        tone: "info",
        heard,
        text: "That didn't go through. Use the buttons on screen.",
      });
    setVoiceFeedback({ tone: "recognized", heard });

    switch (plan.kind) {
      case "replay-step":
        readAloud.current?.replayStep();
        done(plan.ack);
        return;
      case "answer":
        if (speech !== "unsupported") readAloud.current?.say(plan.segments);
        done(plan.text);
        return;
      case "navigate": {
        setFinishCheck(null);
        readAloud.current?.readOnNextStep();
        const ok = await apply((s) =>
          plan.direction === "next" ? advanceStep(s, clock.now()) : previousStep(s, clock.now()),
        );
        if (ok) done(plan.ack);
        else failed();
        return;
      }
      case "start-timer": {
        let reusedLabel: string | null = null;
        const ok = await apply((s) => {
          const added = addSessionTimer(s, plan.seconds, clock.now());
          if (added.reused) {
            reusedLabel = added.session.timers.find((t) => t.id === added.timerId)?.label ?? null;
          }
          return added.session;
        });
        if (!ok) {
          failed();
          return;
        }
        // The step's own timer matched, so that's the one that started: name it.
        const ack = reusedLabel ? `${reusedLabel} timer started` : plan.ack;
        done(ack);
        say(reusedLabel ? `${ack}.` : plan.say);
        return;
      }
      case "timer": {
        const ok = await apply((s) => applySessionTimer(s, plan.timerId, plan.action, clock.now()));
        if (ok) {
          done(plan.ack);
          say(plan.say);
        } else failed();
        return;
      }
      case "speech":
        if (plan.action === "pause") readAloud.current?.pause();
        else if (plan.action === "resume") readAloud.current?.resume();
        else readAloud.current?.stop();
        done(plan.ack);
        return;
      case "stop-listening":
        stopListening.current();
        done(plan.ack);
        return;
      case "explain":
        setVoiceFeedback({ tone: "info", heard, text: plan.text });
        say(plan.text);
        return;
      case "clarify":
        setVoiceFeedback({ tone: "clarify", heard, text: plan.text });
        say(plan.text);
        return;
    }
  };
  const voice = useVoiceCommands((alts) => void handlePhrase(alts), view?.kind === "cooking");
  stopListening.current = voice.stop;

  // Screen wake (Phase 31): held only while a session is being cooked; released
  // on pause, finish, end, or leaving. Failure never touches timers or saving.
  const wake = useScreenWake(view?.kind === "cooking" ? view.session.status : null);

  // Feedback stays until the next command or until the mic is turned off: no
  // timeout, so nobody loses a message they were still reading (WCAG 2.2.1).

  // After a step change (not the first render), start the new step at the
  // top and move focus to its heading so screen readers announce it.
  const currentIndex = view?.kind === "cooking" ? view.stepIndex : null;
  useEffect(() => {
    if (currentIndex === null) return;
    if (lastStep.current !== null && lastStep.current !== currentIndex) {
      window.scrollTo({ top: 0 });
      headingRef.current?.focus();
    }
    lastStep.current = currentIndex;
  }, [currentIndex]);

  if (!view) {
    return (
      <p role="status" className="text-[1rem] text-white/70">
        Loading your cooking session…
      </p>
    );
  }

  const home = (
    <Link href="/" className={primary}>
      Back to Home
    </Link>
  );

  switch (view.kind) {
    case "not-found":
      return (
        <Panel title="Session not found">
          <p className="text-[1rem] leading-7 text-white/70">
            This cooking session isn&apos;t on this device. It may have been started on another
            device or cleared from storage.
          </p>
          {home}
        </Panel>
      );
    case "corrupt": {
      const salvage = salvageSession(damagedRaw);
      return (
        <Panel title="This session can't be opened">
          <p className="text-[1rem] leading-7 text-white/70">
            The saved data for this session is damaged, so it can&apos;t be continued safely.
            {salvage
              ? ` It looks like ${salvage.recipeTitle ?? "a recipe"}${
                  salvage.servings ? ` for ${salvage.servings} servings` : ""
                }${salvage.stepNumber ? `, at step ${salvage.stepNumber}` : ""}.`
              : ""}{" "}
            Nothing has been deleted.
          </p>
          {salvage?.recipeSlug && (
            <Link
              href={kitchenCheckHref(salvage.recipeSlug, { servings: salvage.servings ?? 1 })}
              className={primary}
            >
              Start {salvage.recipeTitle ?? "this recipe"} again
            </Link>
          )}
          {removeConfirm ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4">
              <p className="text-[0.9375rem] text-white/80">Remove the damaged session for good?</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={quiet}
                  onClick={async () => {
                    try {
                      await sessions.remove(sessionId);
                      setView({ kind: "not-found" });
                    } catch {
                      setError("Couldn't remove it from this device.");
                    }
                  }}
                >
                  Remove it
                </button>
                <button type="button" className={quiet} onClick={() => setRemoveConfirm(false)}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={quiet} onClick={() => setRemoveConfirm(true)}>
              Remove damaged session
            </button>
          )}
          {error && (
            <p role="alert" className="text-[0.875rem] text-error-100">
              {error}
            </p>
          )}
          {home}
        </Panel>
      );
    }
    case "completed": {
      const summary = completionSummary(view.session);
      if (summary) {
        return (
          <CompletionScreen
            summary={summary}
            recipeSlug={view.session.recipeSlug}
            demo={Boolean(view.session.demo)}
            justFinished={justFinished}
          />
        );
      }
      return (
        <Panel title="Cooking complete">
          <Link href="/" className={primary}>
            Back to Home
          </Link>
        </Panel>
      );
    }
    case "abandoned": {
      const s = view.session;
      return (
        <Panel title="This session was ended">
          <p className="text-[1rem] leading-7 text-white/70">
            {s.recipeTitle ?? "This recipe"} · {s.servings} servings. Ended sessions can&apos;t be
            resumed. To cook it again, start a new session from Kitchen Check.
          </p>
          <Link href={kitchenCheckHref(s.recipeSlug, { servings: s.servings })} className={primary}>
            Open Kitchen Check
          </Link>
        </Panel>
      );
    }
    case "no-snapshot":
      return (
        <Panel title="This session is out of date">
          <p className="text-[1rem] leading-7 text-white/70">
            It was saved before Kooking kept a copy of the steps, so it can&apos;t be continued
            safely. End it and start again from Kitchen Check.
          </p>
          <Link
            href={kitchenCheckHref(view.session.recipeSlug, { servings: view.session.servings })}
            className={primary}
          >
            Open Kitchen Check
          </Link>
          <button
            type="button"
            className={quiet}
            onClick={() => apply((s) => transitionSession(s, "abandon", Date.now()))}
          >
            End this session
          </button>
        </Panel>
      );
    case "cooking": {
      const { session, stepIndex } = view;
      const step = stepDisplay(session, stepIndex)!;
      const stepNumberOf = (stepId: string) =>
        session.steps.findIndex((st) => st.id === stepId) + 1;
      const goToStepId = (stepId: string) =>
        apply((s) => goToStep(s, stepNumberOf(stepId) - 1, Date.now()));
      const stepTimer = stepTimerFor(session, step.id);
      const progress = progressSummary(session);
      const doneSteps = session.steps.map((st) => session.completedStepIds.includes(st.id));
      const finish = (stopTimers: boolean) => {
        const check = checkFinish(session, at());
        if (check.kind === "incomplete-steps" || (check.kind === "timers-running" && !stopTimers)) {
          setFinishCheck(check);
          return;
        }
        setFinishCheck(null);
        setJustFinished(true);
        void apply((s) => finishCooking(s, at(), { stopTimers }));
      };
      const others = session.timers.filter((t) => t.id !== stepTimer?.id);
      const paused = session.status === "paused";
      const at = () => clock.now();
      return (
        <CookingStep
          statusSlot={
            <SessionStatus
              online={online}
              saveFailed={saveFailed}
              syncNotice={syncNotice}
              onRetry={() => apply((s) => ({ ...s }))}
            />
          }
          step={step}
          progress={progress}
          doneSteps={doneSteps}
          speechSlot={
            <ReadAloud
              readKey={`${session.id}:${step.id}`}
              segments={stepSpeech(step)}
              stepNumber={step.number}
              // Recipes don't carry a locale yet; use the page's language.
              lang={typeof document === "undefined" ? null : document.documentElement.lang || null}
              paused={paused}
              handleRef={readAloud}
            />
          }
          voiceHelpSlot={<VoiceHelp state={voice.state} />}
          wakeSlot={
            <ScreenWakeControl
              state={wake.state}
              enabled={wake.enabled}
              sessionPaused={paused}
              onToggle={wake.toggle}
              onRetry={wake.retry}
            />
          }
          micSlot={
            <MicButton
              state={voice.state}
              onStart={() => {
                // A press is the moment browsers allow audio; voice timers can chime.
                chime.current?.unlock();
                setVoiceFeedback(null);
                voice.start();
              }}
              onStop={() => {
                setVoiceFeedback(null);
                voice.stop();
              }}
            />
          }
          voiceStatusSlot={
            voiceStatusVisible(voice.state, voiceFeedback) ? (
              <VoiceStatus
                state={voice.state}
                feedback={voiceFeedback}
                onStop={() => {
                  setVoiceFeedback(null);
                  voice.stop();
                }}
                onRetry={() => voice.start()}
              />
            ) : null
          }
          promptSlot={
            finishCheck && (
              <FinishPrompt
                check={finishCheck}
                onGoToStep={(n) => {
                  setFinishCheck(null);
                  void apply((s) => goToStep(s, n - 1, at()));
                }}
                onConfirmStopTimers={() => finish(true)}
                onDismiss={() => setFinishCheck(null)}
              />
            )
          }
          recipeTitle={session.recipeTitle ?? "Cooking"}
          servings={session.servings}
          demo={Boolean(session.demo)}
          paused={paused}
          busy={busy}
          error={error}
          notice={
            view.recipeMissing
              ? "This recipe is no longer in the catalog. You're cooking from the copy saved when you started."
              : view.recipeUpdated
                ? "This recipe has been updated since you started. You're still cooking from the version you started with."
                : null
          }
          headingRef={headingRef}
          onPrevious={() => {
            setFinishCheck(null);
            void apply((s) => previousStep(s, at()));
          }}
          onNext={() => {
            setFinishCheck(null);
            void apply((s) => advanceStep(s, at()));
          }}
          onFinish={() => finish(false)}
          onPause={() => apply((s) => transitionSession(s, "pause", at()))}
          onResume={() => apply((s) => transitionSession(s, "resume", at()))}
          alertSlot={
            <TimerAlertBanner
              timers={pendingAlerts(others)}
              stepNumberOf={stepNumberOf}
              onGoTo={goToStepId}
              onDismiss={(id) => timerAction(id, "acknowledge")}
            />
          }
          hasTimer={stepTimer !== null}
          timerSlot={
            stepTimer && (
              <StepTimerCard
                timer={stepTimer}
                readyCue={step.readinessCheck}
                onAction={(a) => timerAction(stepTimer.id, a)}
                alertControls={
                  stepTimer.status !== "idle" && (
                    <AlertControls
                      soundOn={soundOn}
                      soundAvailable={soundAvailable}
                      notifications={notifications}
                      onToggleSound={() => {
                        setSoundPreference(!soundOn);
                        setSoundOn(!soundOn);
                      }}
                      onEnableNotifications={async () =>
                        setNotifications(await requestNotifications())
                      }
                    />
                  )
                }
              />
            )
          }
          barSlot={
            others.some((t) => t.status !== "idle" && !(t.status === "done" && t.acknowledged)) ? (
              <OtherTimersBar
                timers={others.filter(
                  (t) => t.status !== "idle" && !(t.status === "done" && t.acknowledged),
                )}
                stepNumberOf={stepNumberOf}
                onOpen={goToStepId}
              />
            ) : null
          }
        />
      );
    }
  }
}
