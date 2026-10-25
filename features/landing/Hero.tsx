"use client";

import { Check, Clock, Minus, Plus } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { ROTATING_DISHES } from "./content";
import { Reveal, useCycle, usePrefersReducedMotion } from "./motion";
import { Photo } from "./Texture";
import { Band, Eyebrow, Mark, PillCta, TextCta } from "./ui";

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
    <div className="lift rounded-[22px] bg-ink-900 p-5 text-left text-white">
      <div className="flex items-center justify-between font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-white/60">
        <span>Step 04 / 09</span>
        <span className="flex items-center gap-1.5">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary-500" /> Cooking
        </span>
      </div>
      <p className="mt-4 text-[0.9375rem] leading-snug">
        Fry the tomato paste until the oil rises to the top.
      </p>
      <p className="mt-2 text-[0.8125rem] leading-snug text-white/60">
        Ready when: deep brick red, oil pooling at the edges.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-[14px] bg-white/[0.08] py-2.5 pl-4 pr-2.5">
        <span className="font-mono text-[1.5rem] leading-none tnum">
          {mm}:{ss}
        </span>
        <span className="rounded-full bg-primary-500 px-3 py-1.5 text-[0.75rem] font-medium text-ink-900">
          Pause
        </span>
      </div>
    </div>
  );
}

function CheckCard() {
  return (
    <div className="lift rounded-[22px] bg-white p-5 text-left">
      <div className="flex items-baseline justify-between">
        <p className="text-[0.9375rem] font-medium">Kitchen Check</p>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-500">
          Serves 6
        </p>
      </div>
      <div className="mt-3 h-1 rounded-full bg-surface-200">
        <div className="h-full w-2/3 rounded-full bg-primary-500" />
      </div>
      <ul className="mt-4 flex flex-col gap-2.5 text-[0.8125rem]">
        {[
          ["Long-grain rice", "750 g", true],
          ["Tomato paste", "Purée ✓", true],
          ["Scotch bonnet", "Need 2", false],
        ].map(([n, s, ok]) => (
          <li key={n as string} className="flex items-center gap-2.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                ok ? "bg-primary-500 text-ink-900" : "border border-line-strong"
              }`}
            >
              {ok && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="flex-1">{n as string}</span>
            <span
              className={`font-mono text-[0.75rem] ${ok ? "text-ink-500" : "text-primary-700"}`}
            >
              {s as string}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Hero() {
  const [dish] = useCycle(ROTATING_DISHES.length, 2600);

  return (
    <>
      <section id="top" className="relative px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:pt-24">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center text-center">
          <Reveal>
            <a
              href="#how"
              className="group inline-flex min-h-[36px] items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3.5 text-[0.8125rem] text-ink-600 ring-1 ring-inset ring-line-default transition-colors hover:ring-line-strong"
            >
              <Eyebrow>For Nigerian kitchens</Eyebrow>
              See how it works
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </Reveal>

          <h1 className="mt-9 font-display text-[3.25rem] font-normal leading-[0.98] tracking-[-0.03em] text-ink-900 sm:text-[5rem] lg:text-[6.25rem]">
            <span className="sr-only">Your first pot won’t taste like a first.</span>
            <span aria-hidden className="block">
              Your first <br className="sm:hidden" />
              <span className="relative inline-block whitespace-nowrap text-primary-600">
                <span key={dish} className="word-in">
                  {ROTATING_DISHES[dish]}
                </span>
              </span>
            </span>
            <span aria-hidden className="block">
              won’t taste like a first.
            </span>
          </h1>

          <Reveal delay={120}>
            <p className="mx-auto mt-8 max-w-[560px] text-[1.0625rem] leading-[1.65] text-ink-500 sm:text-[1.1875rem]">
              Fork checks what’s already in <Mark>your kitchen</Mark>, puts what’s missing on a{" "}
              <Mark tone="leaf">shopping list</Mark>, then cooks with you one step at a time, with
              timers, read-aloud and voice.
            </p>
          </Reveal>

          <Reveal delay={220} className="mt-9 flex flex-col items-center gap-2 sm:flex-row">
            <PillCta href="/">Start cooking, free</PillCta>
            <TextCta href="/recipes">Browse recipes</TextCta>
          </Reveal>

          <Reveal delay={300}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-400">
              {["No account needed", "Works offline", "Checked by people, not AI"].map((t, i) => (
                <li key={t} className="inline-flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-ink-300" />}
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Stage: a real kitchen in a frame, with the product floating over it. */}
      <Band label="Fork in a real kitchen" innerClassName="py-8 sm:py-10 lg:py-12">
        <Reveal delay={150} className="relative">
          <div className="frame">
            <div className="relative h-[360px] overflow-hidden rounded-[18px] sm:h-[480px] lg:h-[580px]">
              <Photo name="greens" priority sizes="(min-width: 1200px) 1100px, 100vw" />
            </div>
          </div>

          <div aria-hidden>
            <div className="absolute left-10 top-10 hidden w-[280px] lg:block">
              <Reveal delay={420}>
                <div className="drift" style={d(0)}>
                  <CheckCard />
                </div>
              </Reveal>
            </div>

            <div className="absolute bottom-12 left-10 hidden lg:block">
              <Reveal delay={620}>
                <div
                  className="drift lift flex items-center gap-3 rounded-full bg-white p-1.5"
                  style={d(1500)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-100">
                    <Minus size={15} />
                  </span>
                  <span className="font-mono text-[0.8125rem] tnum">6 servings</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500">
                    <Plus size={15} />
                  </span>
                </div>
              </Reveal>
            </div>

            <div className="absolute right-10 top-16 hidden w-[280px] lg:block">
              <Reveal delay={520}>
                <div className="drift" style={d(2600)}>
                  <TimerCard />
                </div>
              </Reveal>
            </div>

            <div className="absolute bottom-12 right-10 hidden lg:block">
              <Reveal delay={720}>
                <div
                  className="drift lift flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-5"
                  style={d(3600)}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-100">
                    <Clock size={15} />
                  </span>
                  <span className="text-[0.875rem]">
                    <span className="font-medium">1 hr 20 min</span>
                    <span className="text-ink-500"> · wash to plate</span>
                  </span>
                </div>
              </Reveal>
            </div>

            {/* Phones and tablets: one card overlapping the photo's bottom edge */}
            <div className="relative z-10 mx-3 -mt-28 sm:mx-auto sm:w-[340px] lg:hidden">
              <CheckCard />
            </div>
          </div>
        </Reveal>
      </Band>
    </>
  );
}
