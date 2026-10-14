/**
 * In-page clock for timers.
 *
 * Persisted timer state is wall-clock (`Date.now()`) so it survives
 * reloads. While the page is visible we advance from a monotonic source
 * (`performance.now()`), so a clock change mid-session can't make the
 * countdown jump. Whenever the page becomes visible again, gains focus,
 * or is restored from the back/forward cache, we re-anchor to the wall
 * clock — that's the moment the device may have slept, so the persisted
 * `endsAt` is the only trustworthy reference.
 */
export interface TimerClock {
  now(): number;
  /** Re-anchor to the wall clock. */
  resync(): void;
}

export function createTimerClock(
  wall: () => number = () => Date.now(),
  mono: () => number = () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
): TimerClock {
  let wallAnchor = wall();
  let monoAnchor = mono();
  return {
    now: () => Math.round(wallAnchor + (mono() - monoAnchor)),
    resync: () => {
      wallAnchor = wall();
      monoAnchor = mono();
    },
  };
}
