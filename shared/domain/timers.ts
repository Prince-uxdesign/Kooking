import { z } from "zod";

/**
 * Cooking timers (Phase 25).
 *
 * The source of truth is a timestamp, never a tick count:
 * - running  → `endsAt` (wall-clock ms). Remaining = endsAt − now.
 * - paused   → `remainingMs`, captured exactly at pause. Resuming sets a
 *              fresh `endsAt = now + remainingMs`, so pause/resume cycles
 *              never accumulate rounding error.
 * - idle     → `remainingMs` = full duration.
 * - done     → `finishedAt` = the moment it ran out (its old `endsAt`),
 *              so "finished 6 min ago" is correct even if noticed late.
 *
 * Every function is pure and takes `now`, so tests use fixed clocks and
 * the UI decides which clock to pass in.
 */

export const MIN_TIMER_SECONDS = 5;
export const MAX_TIMER_SECONDS = 86_400;

export const timerStatus = ["idle", "running", "paused", "done"] as const;
export type TimerStatus = (typeof timerStatus)[number];

const timerObject = z.object({
  id: z.string().min(1).max(100),
  stepId: z.string().min(1).max(100),
  /** What the timer is for ("Simmer base"), so a cook can tell timers apart. */
  label: z.string().min(1).max(80).optional(),
  durationSeconds: z.number().int().min(MIN_TIMER_SECONDS).max(MAX_TIMER_SECONDS),
  status: z.enum(timerStatus),
  /** First start of the current run; null when idle. */
  startedAt: z.number().int().nonnegative().nullable().default(null),
  /** Expiration while running; null otherwise. */
  endsAt: z.number().int().nonnegative().nullable(),
  /** Remaining time while idle or paused. Not maintained while running. */
  remainingMs: z.number().int().min(0),
  finishedAt: z.number().int().nonnegative().nullable().default(null),
  /** The cook has seen the "time's up" alert. */
  acknowledged: z.boolean().default(false),
});

/** Accepts timers saved before Phase 25 (whole-second `remainingSeconds`). */
export const sessionTimerSchema = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && !("remainingMs" in raw) && "remainingSeconds" in raw) {
    const { remainingSeconds, ...rest } = raw as Record<string, unknown>;
    const legacy = rest as Record<string, unknown>;
    const done = legacy.status === "done";
    return {
      ...legacy,
      remainingMs: typeof remainingSeconds === "number" ? remainingSeconds * 1000 : 0,
      finishedAt: done ? (legacy.endsAt ?? null) : null,
      acknowledged: done,
    };
  }
  return raw;
}, timerObject);

export type SessionTimer = z.infer<typeof timerObject>;

export class TimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimerError";
  }
}

export function durationMs(timer: Pick<SessionTimer, "durationSeconds">): number {
  return timer.durationSeconds * 1000;
}

/**
 * Remaining time at `now`. Clamped to [0, duration], so a clock moved
 * backwards can never show more time than the timer was set for.
 */
export function remainingMs(timer: SessionTimer, now: number): number {
  if (timer.status === "done") return 0;
  if (timer.status !== "running" || timer.endsAt === null) {
    return Math.min(timer.remainingMs, durationMs(timer));
  }
  return Math.min(Math.max(timer.endsAt - now, 0), durationMs(timer));
}

export function isExpired(timer: SessionTimer, now: number): boolean {
  return timer.status === "running" && timer.endsAt !== null && timer.endsAt <= now;
}

/** "9:58" / "1:02:05". Rounds up so a timer never reads 0:00 while still running. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "10 minutes", "1 hour 5 minutes", "45 seconds" for labels and speech. */
export function describeDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [
    h && `${h} hour${h === 1 ? "" : "s"}`,
    m && `${m} minute${m === 1 ? "" : "s"}`,
    s && `${s} second${s === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return parts.join(" ") || "0 seconds";
}

export function createTimer(args: {
  id: string;
  stepId: string;
  durationSeconds: number;
  label?: string;
}): SessionTimer {
  const d = args.durationSeconds;
  if (!Number.isInteger(d) || d < MIN_TIMER_SECONDS || d > MAX_TIMER_SECONDS) {
    throw new TimerError(
      `timer duration must be a whole number of seconds from ${MIN_TIMER_SECONDS} to ${MAX_TIMER_SECONDS}`,
    );
  }
  return timerObject.parse({
    id: args.id,
    stepId: args.stepId,
    label: args.label,
    durationSeconds: d,
    status: "idle",
    startedAt: null,
    endsAt: null,
    remainingMs: d * 1000,
    finishedAt: null,
    acknowledged: false,
  });
}

/* ------------------------------------------------------------------ */
/* Transitions (per timer)                                            */
/* ------------------------------------------------------------------ */

export type TimerAction = "start" | "pause" | "resume" | "cancel" | "reset" | "acknowledge";

const ALLOWED: Record<TimerStatus, readonly TimerAction[]> = {
  idle: ["start"],
  running: ["pause", "cancel"],
  paused: ["resume", "cancel"],
  done: ["reset", "acknowledge"],
};

export function canApply(timer: SessionTimer, action: TimerAction): boolean {
  return ALLOWED[timer.status].includes(action);
}

/**
 * Apply one action. A running timer that has already expired is first
 * settled to `done`, so "pause" at 0:00 can't resurrect it.
 */
export function applyTimerAction(
  timer: SessionTimer,
  action: TimerAction,
  now: number,
): SessionTimer {
  const t = settleTimer(timer, now);
  if (!canApply(t, action)) {
    throw new TimerError(`cannot ${action} a ${t.status} timer`);
  }
  switch (action) {
    case "start":
      return { ...t, status: "running", startedAt: now, endsAt: now + t.remainingMs };
    case "resume":
      return { ...t, status: "running", endsAt: now + t.remainingMs };
    case "pause":
      return { ...t, status: "paused", endsAt: null, remainingMs: remainingMs(t, now) };
    case "cancel":
    case "reset":
      return {
        ...t,
        status: "idle",
        startedAt: null,
        endsAt: null,
        remainingMs: durationMs(t),
        finishedAt: null,
        acknowledged: false,
      };
    case "acknowledge":
      return { ...t, acknowledged: true };
  }
}

/** Move an expired running timer to `done`, stamped with when it actually ran out. */
export function settleTimer(timer: SessionTimer, now: number): SessionTimer {
  if (!isExpired(timer, now)) return timer;
  return {
    ...timer,
    status: "done",
    finishedAt: timer.endsAt,
    endsAt: null,
    remainingMs: 0,
    acknowledged: false,
  };
}

/** Settle every timer; returns the ids that finished in this call. */
export function settleTimers(
  timers: SessionTimer[],
  now: number,
): { timers: SessionTimer[]; finished: string[] } {
  const finished: string[] = [];
  const next = timers.map((t) => {
    const s = settleTimer(t, now);
    if (s !== t) finished.push(t.id);
    return s;
  });
  return { timers: finished.length ? next : timers, finished };
}

/** Timers finished and not yet acknowledged, oldest first. */
export function pendingAlerts(timers: SessionTimer[]): SessionTimer[] {
  return timers
    .filter((t) => t.status === "done" && !t.acknowledged)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
}

/** Next wall-clock moment any running timer expires, for scheduling one wake-up. */
export function nextExpiry(timers: SessionTimer[]): number | null {
  const ends = timers.flatMap((t) =>
    t.status === "running" && t.endsAt !== null ? [t.endsAt] : [],
  );
  return ends.length ? Math.min(...ends) : null;
}
