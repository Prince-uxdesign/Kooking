"use client";

import { Mic, Sun, Volume2 } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Reveal, useCycle, useInView, usePrefersReducedMotion, useScrollProgress } from "./motion";
import { photoUrl } from "./Texture";
import { Band, ChapterHead, GrainStage, Index } from "./ui";

const COMMANDS = [
  { said: "next", result: "Step 5 of 9: Pour in the pepper blend." },
  { said: "start timer", result: "Timer started. 20 minutes." },
  { said: "repeat", result: "Reading step 5 again, slowly." },
  { said: "back", result: "Step 4 of 9: Fry the tomato paste." },
];

const NOTES = [
  {
    title: "One step, full screen",
    text: "The quantity that step needs sits right under it. No scrolling back up mid-stir.",
  },
  {
    title: "What “done” looks like",
    text: "Every step ends on a cue you can see, smell or hear, not just a number of minutes.",
  },
  {
    title: "Timers off the clock",
    text: "They run from the device clock, not the page. Lock your phone; they’re still right.",
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
    <div ref={ref} className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="rgb(255 255 255 / 0.1)"
          strokeWidth="5"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--color-primary-500)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={RING}
          strokeDashoffset={RING * (1 - left / total)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[1.5rem] leading-none tnum">
          {mm}:{ss}
        </span>
        <span className="mt-1.5 text-[0.75rem] text-white/60">Simmer</span>
      </div>
    </div>
  );
}

export function CookingSpotlight() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>(1, 0.45);
  const [cmd] = useCycle(COMMANDS.length, 3000);
  const c = COMMANDS[cmd];

  return (
    <Band id="cooking" labelledBy="cooking-title" flush innerClassName="p-2 sm:p-3">
      <div
        ref={ref}
        // The dark sheet widens to the rails as it arrives: a card becoming the room.
        className="spotlight-band on-dark rounded-[28px] bg-ink-900 text-white"
        style={{ "--p": progress } as CSSProperties}
      >
        <div className="px-5 py-20 sm:px-10 sm:py-28 lg:px-14 lg:py-32">
          <Reveal>
            <ChapterHead
              id="cooking-title"
              num="02"
              label="Cook"
              dark
              title={
                <>
                  Hands covered in pepper?{" "}
                  <span className="text-primary-400">Just say “next.”</span>
                </>
              }
              lead="Cooking Mode keeps the screen awake, reads each step aloud and listens for next, back, repeat and start timer. Every command has a button too, so cooking never depends on the mic."
            />
          </Reveal>

          <Reveal delay={120} className="mt-14 lg:mt-20">
            <GrainStage
              dark
              src={photoUrl("grill", 1800)}
              className="flex min-h-[560px] items-center justify-center px-3 py-10 sm:px-8 sm:py-16"
            >
              <div className="grid w-full max-w-[860px] items-center gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                {/* The step card, as it appears in Cooking Mode */}
                <div className="rounded-[22px] bg-ink-900/90 p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_30px_60px_-30px_rgb(0_0_0/0.8)] sm:p-7">
                  <div className="flex items-center justify-between">
                    <Index dark>05 / 09</Index>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-[0.75rem] text-white/70">
                      <Sun size={12} aria-hidden /> Screen on
                    </span>
                  </div>
                  <div className="mt-4 flex gap-1" aria-hidden>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full ${i < 5 ? "bg-primary-500" : "bg-white/15"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-6 text-[0.8125rem] text-white/50">Simmer the stew</p>
                  <p className="mt-2 text-[1.375rem] leading-snug tracking-[-0.015em] sm:text-[1.5rem]">
                    Pour in the pepper blend and simmer until it thickens.
                  </p>
                  <p className="mt-4 inline-flex rounded-full bg-primary-600 px-3 py-1.5 text-[0.8125rem] font-medium text-white">
                    All of the pepper blend
                  </p>
                  <div className="mt-5 border-t border-dashed border-white/15 pt-4">
                    <p className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-white/50">
                      Ready when
                    </p>
                    <p className="mt-1.5 text-[0.9375rem] text-white/85">
                      A spoon dragged through leaves a clear line.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-5 rounded-[22px] bg-ink-900/90 p-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_30px_60px_-30px_rgb(0_0_0/0.8)]">
                    <TimerRing />
                    <div>
                      <p className="text-[0.9375rem]">20-minute simmer</p>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-white/55">
                        Survives a reload, a locked phone and a closed tab.
                      </p>
                    </div>
                  </div>
                  <div
                    aria-hidden
                    className="flex items-center gap-4 rounded-[22px] bg-ink-900/90 p-4 pr-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08),0_30px_60px_-30px_rgb(0_0_0/0.8)]"
                  >
                    <span className="flex h-11 shrink-0 items-center gap-[3px] rounded-full bg-white/10 px-4">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <span
                          key={i}
                          className="wave-bar block h-5 w-[3px] rounded-full bg-primary-500"
                          style={{ "--d": `${i * 0.1}s` } as CSSProperties}
                        />
                      ))}
                    </span>
                    <span className="min-w-0">
                      <span key={`s-${cmd}`} className="word-in block text-[1.0625rem]">
                        “{c.said}”
                      </span>
                      <span
                        key={`r-${cmd}`}
                        className="screen-in block truncate text-[0.8125rem] text-white/60"
                      >
                        {c.result}
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2" aria-hidden>
                    <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] text-[0.8125rem] text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
                      <Volume2 size={14} /> Read aloud
                    </span>
                    <span className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] text-[0.8125rem] text-white/80 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]">
                      <Mic size={14} /> Listening
                    </span>
                  </div>
                </div>
              </div>
            </GrainStage>
          </Reveal>

          <ul className="mt-14 grid gap-10 border-t border-white/10 pt-10 md:grid-cols-3 md:gap-8">
            {NOTES.map((n, i) => (
              <Reveal as="li" key={n.title} delay={i * 80}>
                <p className="font-mono text-[0.75rem] text-white/60 tnum">02.{i + 1}</p>
                <p className="mt-3 text-[1.125rem] tracking-[-0.01em]">{n.title}</p>
                <p className="mt-2 max-w-[320px] text-[0.9375rem] leading-relaxed text-white/55">
                  {n.text}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Band>
  );
}
