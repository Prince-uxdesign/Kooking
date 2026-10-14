"use client";

import { useEffect, useRef, useState } from "react";
import { createTimerClock, type TimerClock } from "./timer-clock";

const TICK_MS = 250;

/**
 * Re-renders while timers run and returns the current time. The tick
 * only triggers a redraw; remaining time is always computed from the
 * stored `endsAt`, so a throttled or frozen tab simply catches up on
 * the next tick. Visibility/focus/pageshow re-anchor to the wall clock.
 *
 * `wakeAt` schedules one extra check at the next expiry, so a finish is
 * noticed promptly even where interval ticks are throttled.
 */
export function useTimerClock(running: boolean, wakeAt: number | null) {
  const clockRef = useRef<TimerClock | null>(null);
  clockRef.current ??= createTimerClock();
  const clock = clockRef.current;
  const [now, setNow] = useState(() => clock.now());

  useEffect(() => {
    const sync = () => {
      clock.resync();
      setNow(clock.now());
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [clock]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(clock.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running, clock]);

  useEffect(() => {
    if (wakeAt === null) return;
    const delay = Math.max(0, wakeAt - clock.now()) + 50;
    const id = setTimeout(() => {
      clock.resync();
      setNow(clock.now());
    }, delay);
    return () => clearTimeout(id);
  }, [wakeAt, clock]);

  return { now, clock };
}
