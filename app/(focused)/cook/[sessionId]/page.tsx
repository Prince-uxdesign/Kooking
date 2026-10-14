import Link from "next/link";

/**
 * Focused-mode boundary stub — NOT Cooking Mode.
 * Proves the immersive layout (no tabs, no sidebar, exit always
 * reachable) that step-by-step cooking will use in a later phase.
 */
export default async function CookStubPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  return (
    <section
      aria-labelledby="cook-stub-title"
      className="flex flex-col items-center gap-3 rounded-[32px] bg-white/5 px-6 py-12 text-center"
    >
      <p className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
        Focused mode boundary
      </p>
      <h1 id="cook-stub-title" className="text-[28px] font-semibold leading-9 text-white">
        Cooking Mode lands here
      </h1>
      <p className="max-w-sm text-[15px] leading-6 text-white/70">
        Step-by-step guidance, timers, and progress will render inside this distraction-free layout.
        No navigation chrome, exit always one tap away.
      </p>
      <p className="tnum max-w-full truncate text-[13px] text-white/50">Session: {sessionId}</p>
      <Link
        href="/"
        className="mt-3 inline-flex min-h-[48px] items-center rounded-full bg-primary-500 px-6 text-[15px] font-medium text-ink-900 hover:bg-primary-400"
      >
        Exit to Home
      </Link>
    </section>
  );
}
