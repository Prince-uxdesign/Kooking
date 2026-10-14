"use client";

import { History, Mic, PauseCircle, Sun, Timer, Volume2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Reveal, useCycle, useInView, usePrefersReducedMotion, useScrollProgress } from "./motion";
import { Credit, Photo } from "./Texture";

const COMMANDS = [
  { said: "next", result: "Step 5 of 9: Pour in the pepper blend." },
  { said: "start timer", result: "Timer started. 20 minutes." },
  { said: "repeat", result: "Reading step 5 again, slowly." },
  { said: "back", result: "Step 4 of 9: Fry the tomato paste." },
];

const FEATURES = [
  {
    icon: Volume2,
    title: "Read-aloud",
    text: "Each step is read out, so your eyes stay on the pot.",
  },
  {
    icon: Mic,
    title: "Voice commands",
    text: "Next, back, repeat, start timer. Every one has a button too.",
  },
  {
    icon: Sun,
    title: "Screen stays awake",
    text: "No greasy-finger unlocks halfway through a step.",
  },
  {
    icon: Timer,
    title: "Timers that hold",
    text: "Close the tab, reload, come back. The timer kept counting.",
  },
  {
    icon: PauseCircle,
    title: "Pause and resume",
    text: "Stop on step 5, return hours later, carry on from step 5.",
  },
];

const RING = 2 * Math.PI * 54;

/** Live 20:00 countdown ring, only ticking while on screen. */
function TimerRing() {
  const total = 20 * 60;
  const [left, setLeft] = useState(total - 47);
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({ once: false });
  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setInterval(() => setLeft((l) => (l > 0 ? l - 1 : total)), 1000);
    return () => window.clearInterval(id);
  }, [reduced, inView, total]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div ref={ref} className="relative h-[148px] w-[148px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--color-primary-500)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - left / total)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.75rem] font-semibold leading-none tnum">
          {mm}:{ss}
        </span>
        <span className="mt-1 text-[0.75rem] text-white/60">Simmer</span>
      </div>
    </div>
  );
}

export function CookingSpotlight() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>(1, 0.45);
  const [cmd] = useCycle(COMMANDS.length, 3000);
  const c = COMMANDS[cmd];

  return (
    <section id="cooking" aria-labelledby="cooking-title">
      <div
        ref={ref}
        // The dark band widens to full bleed as it arrives: a card becoming the room.
        className="spotlight-band on-dark bg-ink-900 text-white"
        style={{ "--p": progress } as CSSProperties}
      >
        <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-10 sm:py-32 lg:px-10 lg:py-40">
          <Reveal className="max-w-[820px]">
            <p className="text-[1rem] text-white/60">{"{Cooking Mode}"}</p>
            <h2
              id="cooking-title"
              className="mt-3 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3.25rem] lg:text-[4.25rem]"
            >
              Hands covered in pepper? <span className="text-primary-500">Just say “next.”</span>
            </h2>
            <p className="mt-6 max-w-[560px] text-[1.125rem] leading-[1.65] text-white/70">
              One step fills the screen, along with exactly what that step needs and what it should
              look like when it’s done.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* Real kitchen, with what Kooking heard laid over it */}
            <Reveal className="relative min-h-[420px] overflow-hidden rounded-[32px] lg:min-h-[560px]">
              <div className="absolute inset-0">
                <Photo name="grill" sizes="(min-width: 1024px) 640px, 100vw" />
              </div>
              <div
                aria-hidden
                className="absolute bottom-4 left-4 right-4 flex items-center gap-4 rounded-[24px] bg-ink-900 p-4 sm:right-auto sm:pr-6"
              >
                <span className="flex h-12 items-center gap-[3px] rounded-full bg-white/10 px-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="wave-bar block h-5 w-[3px] rounded-full bg-primary-500"
                      style={{ "--d": `${i * 0.1}s` } as CSSProperties}
                    />
                  ))}
                </span>
                <span>
                  <span key={`s-${cmd}`} className="word-in block text-[1.25rem] font-bold">
                    “{c.said}”
                  </span>
                  <span key={`r-${cmd}`} className="screen-in block text-[0.875rem] text-white/70">
                    {c.result}
                  </span>
                </span>
              </div>
            </Reveal>

            {/* Timer */}
            <Reveal
              delay={100}
              className="flex flex-col justify-between gap-10 rounded-[32px] bg-white/[0.06] p-6 sm:p-10"
            >
              <div>
                <p className="text-[0.875rem] text-white/60">Step 5 of 9 · Simmer the stew</p>
                <p className="mt-3 text-[1.5rem] font-bold leading-snug tracking-[-0.02em] sm:text-[1.75rem]">
                  Pour in the pepper blend and simmer until it thickens.
                </p>
                <p className="mt-4 inline-flex rounded-full bg-primary-500 px-3 py-1.5 text-[0.8125rem] font-medium text-ink-900">
                  All of the pepper blend
                </p>
                <div className="mt-5 rounded-[20px] bg-white/10 p-4">
                  <p className="text-[0.75rem] text-white/60">Ready when</p>
                  <p className="mt-1 text-[0.9375rem]">
                    A spoon dragged through leaves a clear line.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <TimerRing />
                <p className="text-[0.9375rem] leading-relaxed text-white/70">
                  Timers run off the clock, not the page. Lock your phone and they’re still right
                  when you look back.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Features */}
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((f, i) => (
              <Reveal
                as="li"
                key={f.title}
                delay={i * 80}
                className="group flex flex-col gap-4 rounded-[24px] bg-white/[0.06] p-5 transition-colors hover:bg-white/[0.1]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:bg-primary-500 group-hover:text-ink-900">
                  <f.icon size={19} strokeWidth={1.75} aria-hidden />
                </span>
                <span>
                  <span className="block text-[1rem] font-semibold">{f.title}</span>
                  <span className="mt-1 block text-[0.875rem] leading-relaxed text-white/70">
                    {f.text}
                  </span>
                </span>
              </Reveal>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2 px-1 text-[0.875rem] text-white/60 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <History size={16} aria-hidden />
              Every voice command has a touch button. Cooking never depends on the mic.
            </span>
            <Credit name="grill" className="!text-white/50 hover:!text-white" />
          </div>
        </div>
      </div>
    </section>
  );
}
