"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JOURNEY, type JourneyKey } from "./content";
import { JourneyScreen, PhoneFrame } from "./Mockups";
import { Reveal } from "./motion";
import { Band, Eyebrow, Index, SectionHead } from "./ui";

/**
 * Discover → Check → Shop → Cook → Done.
 * Desktop: steps scroll on the left while one sticky phone on the right
 * swaps screens. Phones: each step carries its own screen.
 */
export function Journey() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const current = JOURNEY[active];

  return (
    <Band id="how" labelledBy="how-title" innerClassName="py-20 sm:py-28 lg:py-36">
      <Reveal>
        <SectionHead
          id="how-title"
          eyebrow={<Eyebrow>How it works</Eyebrow>}
          title="From craving to clean plate,"
          tail="in five calm steps."
          lead="One recipe, followed all the way through: what to cook, what you have, what to buy, and every step at the stove."
        />
      </Reveal>

      <div className="mt-16 grid gap-6 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16">
        <ol className="flex flex-col">
          {JOURNEY.map((step, i) => {
            const on = i === active;
            const done = i < active;
            return (
              <li
                key={step.key}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-index={i}
                className="flex min-h-0 flex-col justify-center border-t border-line-default py-10 first:border-t-0 lg:min-h-[68vh] lg:border-t-0 lg:py-0"
              >
                <div className="lg:max-w-[520px]">
                  <div className="flex items-center gap-3">
                    <Index>{step.number}</Index>
                    <span
                      aria-hidden
                      className={`flex h-6 items-center gap-1.5 rounded-full px-2 text-[0.75rem] transition-colors duration-500 ${
                        done
                          ? "bg-ink-900 text-white"
                          : on
                            ? "bg-primary-50 text-primary-700"
                            : "text-ink-500"
                      }`}
                    >
                      {done ? (
                        <>
                          <Check size={12} strokeWidth={2.5} /> Done
                        </>
                      ) : on ? (
                        <>
                          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary-500" /> Now
                        </>
                      ) : (
                        "Next"
                      )}
                    </span>
                  </div>
                  <h3
                    className={`mt-5 text-[1.75rem] font-normal leading-[1.15] tracking-[-0.025em] transition-colors duration-300 sm:text-[2.25rem] ${
                      on ? "text-ink-900" : "lg:text-ink-500"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-4 text-[1.0625rem] leading-[1.7] text-ink-500">{step.lead}</p>
                  <ul className="mt-6 flex flex-col">
                    {step.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-center gap-3 border-t border-dashed border-line-strong py-3 text-[0.9375rem] text-ink-700 last:border-b"
                      >
                        <Check
                          aria-hidden
                          size={15}
                          strokeWidth={2.25}
                          className="shrink-0 text-primary-600"
                        />
                        {p}
                      </li>
                    ))}
                  </ul>

                  {/* Phones and tablets: the screen sits with its step */}
                  <div className="frame mt-8 px-6 pt-8 lg:hidden">
                    <div className="mx-auto h-[400px] w-[240px] overflow-hidden sm:h-[460px] sm:w-[270px]">
                      <PhoneFrame>
                        <JourneyScreen step={step.key} />
                      </PhoneFrame>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Desktop: one sticky phone */}
        <div className="hidden lg:block">
          <div className="sticky top-[13vh]">
            <div className="frame">
              <div className="rounded-[18px] bg-white px-12 pt-12 shadow-[0_0_0_1px_var(--hair)]">
                <div className="h-[560px] overflow-hidden">
                  <PhoneFrame className="mx-auto w-[290px]">
                    <div key={current.key} className="screen-in flex flex-1 flex-col">
                      <JourneyScreen step={current.key as JourneyKey} />
                    </div>
                  </PhoneFrame>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between px-2">
              <span className="font-mono text-[0.75rem] text-ink-500 tnum">
                {current.number} / 0{JOURNEY.length}
              </span>
              <span className="flex gap-1.5">
                {JOURNEY.map((s, i) => (
                  <span
                    key={s.key}
                    className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out ${
                      i === active ? "w-6 bg-primary-500" : "w-1.5 bg-ink-300"
                    }`}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Band>
  );
}
