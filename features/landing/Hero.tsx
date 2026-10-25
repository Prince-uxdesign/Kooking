"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ROTATING_DISHES } from "./content";
import { Reveal, useCycle, useParallax, usePrefersReducedMotion } from "./motion";
import { Photo } from "./Texture";
import { ForkMark } from "@/shared/ui/Logo";
import { Eyebrow, PillCta } from "./ui";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Small live Cooking Mode card: the timer really counts down. */
function TimerCard() {
  const reduced = usePrefersReducedMotion();
  const [left, setLeft] = useState(8 * 60 - 3);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 8 * 60)), 1000);
    return () => window.clearInterval(id);
  }, [reduced]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="lift rounded-[22px] bg-white p-5 text-left text-ink-900">
      <div className="flex items-center justify-between font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-500">
        <span>Step 04 / 09</span>
        <span className="flex items-center gap-1.5">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary-500" /> Cooking
        </span>
      </div>
      <p className="mt-4 text-[0.9375rem] leading-snug">
        Fry the tomato paste until the oil rises to the top.
      </p>
      <p className="mt-2 text-[0.8125rem] leading-snug text-ink-500">
        Ready when: deep brick red, oil pooling at the edges.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-[14px] bg-surface-100 py-2.5 pl-4 pr-2.5">
        <span className="font-mono text-[1.5rem] leading-none tnum">
          {mm}:{ss}
        </span>
        <span className="rounded-full bg-ink-900 px-3 py-1.5 text-[0.75rem] font-medium text-white">
          Pause
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  const [dish] = useCycle(ROTATING_DISHES.length, 2600);
  const photo = useParallax<HTMLDivElement>(0.18);

  return (
    <section id="top" aria-labelledby="hero-title" className="p-2 sm:p-3">
      {/* A real kitchen, edge to edge. The faces stay bright; the words sit
          low on a dark wash so the photo never fights the text. */}
      <div className="relative isolate flex min-h-[calc(100svh-1rem)] flex-col justify-end overflow-hidden rounded-[20px] bg-ink-800 sm:h-[calc(100svh-1.5rem)] sm:max-h-[1000px] sm:min-h-[680px] sm:rounded-[28px]">
        <div ref={photo} className="absolute inset-0 -z-20 will-change-transform">
          <div className="hero-zoom h-full w-full">
            <Photo name="couple" priority sizes="100vw" />
          </div>
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(21_18_15/0.95)_0%,rgb(21_18_15/0.88)_52%,rgb(21_18_15/0.55)_72%,rgb(21_18_15/0)_92%)] sm:bg-[linear-gradient(to_top,rgb(21_18_15/0.92)_0%,rgb(21_18_15/0.78)_38%,rgb(21_18_15/0.4)_62%,rgb(21_18_15/0)_80%),linear-gradient(to_right,rgb(21_18_15/0.6)_0%,rgb(21_18_15/0)_62%)]"
        />

        <div className="px-6 pb-10 pt-28 text-white sm:px-10 sm:pb-12 lg:px-14 lg:pb-14">
          <Reveal>
            <Eyebrow tone="night">For Nigerian kitchens</Eyebrow>
          </Reveal>

          <h1
            id="hero-title"
            className="mt-6 max-w-[920px] font-headline text-[2.75rem] font-medium leading-[0.96] tracking-[-0.02em] sm:text-[4.25rem] lg:text-[5rem]"
          >
            <span className="sr-only">Your first pot won’t taste like a first.</span>
            <span aria-hidden className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="line-rise block" style={d(80)}>
                Your first <br className="sm:hidden" />
                <span className="relative inline-block whitespace-nowrap text-primary-300 sm:text-primary-400">
                  <span key={dish} className="word-in">
                    {ROTATING_DISHES[dish]}
                  </span>
                </span>
              </span>
            </span>
            <span aria-hidden className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span className="line-rise block" style={d(200)}>
                won’t{" "}
                <span className="whitespace-nowrap">
                  taste <ForkMark className="inline-block h-[0.7em] w-[0.7em] align-[-0.04em]" />
                </span>{" "}
                like a first.
              </span>
            </span>
          </h1>

          <div className="mt-7 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Reveal delay={120}>
                <p className="max-w-[500px] text-[1.0625rem] leading-[1.6] text-white/90 sm:text-[1.125rem]">
                  Fork checks what’s already in your kitchen, puts what’s missing on a shopping
                  list, then cooks with you one step at a time, with timers, read-aloud and voice.
                </p>
              </Reveal>

              <Reveal delay={220} className="mt-7 flex flex-wrap items-center gap-2">
                <PillCta href="/app" tone="brand">
                  Start cooking, free
                </PillCta>
                <PillCta href="/welcome/recipes" tone="light">
                  Browse recipes
                </PillCta>
              </Reveal>

              <Reveal delay={300}>
                <ul className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 font-label text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-white/80">
                  {["No account needed", "Works offline", "Checked by people, not AI"].map(
                    (t, i) => (
                      <li key={t} className="inline-flex items-center gap-3">
                        {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-white/50" />}
                        {t}
                      </li>
                    ),
                  )}
                </ul>
              </Reveal>
            </div>

            {/* Large screens: the product itself, resting in the corner. */}
            <div aria-hidden className="hidden w-[280px] shrink-0 xl:block">
              <Reveal delay={420}>
                <div className="drift" style={d(0)}>
                  <TimerCard />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
