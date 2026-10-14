"use client";

import { ArrowRight, Check, Clock, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { buttonClasses } from "@/shared/ui/Button";
import { ROTATING_DISHES } from "./content";
import { Reveal, useCycle, usePrefersReducedMotion } from "./motion";
import { Highlight, Photo } from "./Texture";

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const card = "rounded-[24px] border border-line-default bg-white";

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
    <div className="rounded-[24px] bg-ink-900 p-5 text-left text-white">
      <div className="flex items-center justify-between text-[0.75rem] text-white/60">
        <span>Step 4 of 9</span>
        <span className="flex items-center gap-1.5">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent-500" /> Cooking
        </span>
      </div>
      <p className="mt-3 text-[0.9375rem] leading-snug">
        Fry the tomato paste until the oil rises to the top.
      </p>
      <p className="mt-2 text-[0.75rem] leading-snug text-white/60">
        Ready when: deep brick red, oil pooling at the edges.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-[16px] bg-white/10 px-4 py-3">
        <span className="text-[1.5rem] font-semibold leading-none tnum">
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
    <div className={`${card} p-5 text-left`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[0.9375rem] font-semibold">Kitchen Check</p>
        <p className="text-[0.75rem] text-ink-500">Party jollof · Serves 6</p>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-surface-200">
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
            <span className={ok ? "text-ink-500" : "font-medium text-warning-700"}>
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
    <section id="top" className="relative px-5 pt-14 sm:px-6 sm:pt-20 lg:px-10 lg:pt-24">
      <div className="mx-auto flex max-w-[1080px] flex-col items-center text-center">
        <Reveal>
          <a
            href="#how"
            className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line-default bg-white py-1 pl-1.5 pr-4 text-[0.875rem] text-ink-700 transition-colors hover:border-line-strong"
          >
            <span className="rounded-full bg-primary-100 px-2.5 py-1 text-[0.75rem] font-medium text-primary-800">
              For Nigerian kitchens
            </span>
            Cook it step by step
            <ArrowRight
              size={15}
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </a>
        </Reveal>

        <h1 className="mt-8 text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.04em] text-ink-900 sm:text-[4.25rem] lg:text-[5rem]">
          <span className="sr-only">Your first pot won’t taste like a first.</span>
          <span aria-hidden className="block">
            Your first{" "}
            <Highlight>
              <span key={dish} className="word-in">
                {ROTATING_DISHES[dish]}
              </span>
            </Highlight>
          </span>
          <span aria-hidden className="block">
            won’t taste like a first.
          </span>
        </h1>

        <Reveal delay={120}>
          <p className="mx-auto mt-7 max-w-[660px] text-[1.125rem] leading-[1.6] text-ink-600 sm:text-[1.25rem]">
            Kooking checks what’s already in your kitchen, puts what’s missing on a shopping list,
            then cooks with you one step at a time, with timers, read-aloud and voice commands.
          </p>
        </Reveal>

        <Reveal delay={220} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/"
            className={buttonClasses({ size: "lg", className: "group w-full sm:w-auto" })}
          >
            Start cooking
            <ArrowRight
              size={18}
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
          <Link
            href="/recipes"
            className={buttonClasses({
              variant: "light",
              size: "lg",
              className: "w-full border border-line-strong sm:w-auto",
            })}
          >
            Browse recipes
          </Link>
        </Reveal>

        <Reveal delay={300}>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.875rem] text-ink-500">
            {["No account needed", "Works offline", "Recipes checked by people, not AI"].map(
              (t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <Check size={15} strokeWidth={2.25} aria-hidden className="text-primary-700" />
                  {t}
                </li>
              ),
            )}
          </ul>
        </Reveal>
      </div>

      {/* Composition: a real kitchen, with the product layered on top of it. */}
      <div className="relative mx-auto mt-14 max-w-[1180px] sm:mt-20">
        <Reveal
          delay={150}
          className="relative mx-auto h-[380px] overflow-hidden rounded-[32px] sm:h-[480px] lg:h-[560px] lg:w-[68%]"
        >
          <Photo name="greens" priority sizes="(min-width: 1024px) 800px, 100vw" />
        </Reveal>

        <div aria-hidden>
          <div className="absolute left-0 top-12 hidden w-[290px] lg:block">
            <Reveal delay={420}>
              <div className="drift" style={d(0)}>
                <CheckCard />
              </div>
            </Reveal>
          </div>

          <div className="absolute bottom-14 left-[6%] hidden lg:block">
            <Reveal delay={620}>
              <div
                className="drift flex items-center gap-3 rounded-full border border-line-default bg-white p-1.5"
                style={d(1500)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-100">
                  <Minus size={16} />
                </span>
                <span className="text-[0.9375rem] font-medium tnum">6 servings</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500">
                  <Plus size={16} />
                </span>
              </div>
            </Reveal>
          </div>

          <div className="absolute right-0 top-24 hidden w-[290px] lg:block">
            <Reveal delay={520}>
              <div className="drift" style={d(2600)}>
                <TimerCard />
              </div>
            </Reveal>
          </div>

          <div className="absolute bottom-10 right-[5%] hidden lg:block">
            <Reveal delay={720}>
              <div
                className={`drift flex items-center gap-3 ${card} rounded-full py-2 pl-2 pr-5`}
                style={d(3600)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-100">
                  <Clock size={16} />
                </span>
                <span className="text-[0.875rem]">
                  <span className="font-medium">1 hr 20 min</span>
                  <span className="text-ink-500"> · wash to plate</span>
                </span>
              </div>
            </Reveal>
          </div>

          {/* Phones and tablets: one card overlapping the photo's bottom edge */}
          <div className="relative z-10 mx-4 -mt-24 sm:mx-auto sm:w-[340px] lg:hidden">
            <CheckCard />
          </div>
        </div>
      </div>
    </section>
  );
}
