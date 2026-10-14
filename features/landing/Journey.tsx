"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { JOURNEY, type JourneyKey } from "./content";
import { JourneyScreen, PhoneFrame } from "./Mockups";
import { Reveal } from "./motion";
import { Highlight, Wash } from "./Texture";

/**
 * Discover → Check → Shop → Cook → Done.
 * Desktop: steps scroll on the left while one sticky phone on the right
 * swaps screens and a rail fills. Phones: each step carries its own screen.
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
  const dark = current.key === "cook";

  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="relative isolate px-5 py-28 sm:px-6 sm:py-36 lg:px-10 lg:py-44"
    >
      <Wash tone="green" />
      <div className="mx-auto max-w-[1180px]">
        <Reveal className="mx-auto max-w-[820px] text-center">
          <p className="text-[1rem] text-ink-600">{"{How it works}"}</p>
          <h2
            id="how-title"
            className="mt-3 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3.25rem] lg:text-[4rem]"
          >
            From craving to clean plate, in <Highlight>five calm steps.</Highlight>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
          <ol className="flex flex-col">
            {JOURNEY.map((step, i) => {
              const on = i === active;
              return (
                <li
                  key={step.key}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  data-index={i}
                  className="flex min-h-0 flex-col justify-center py-8 lg:min-h-[70vh] lg:py-0"
                >
                  <div className="flex gap-5 sm:gap-8">
                    {/* Rail: number circle + track that fills as you pass */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-medium tnum transition-colors duration-500 ${
                          i < active
                            ? "bg-ink-900 text-white"
                            : on
                              ? "bg-primary-500 text-ink-900"
                              : "bg-white text-ink-500"
                        }`}
                      >
                        {i < active ? (
                          <Check size={18} strokeWidth={2.25} aria-hidden />
                        ) : (
                          step.number
                        )}
                      </span>
                      {i < JOURNEY.length - 1 && (
                        <span className="mt-3 w-[2px] flex-1 overflow-hidden rounded-full bg-white">
                          <span
                            className="block h-full w-full origin-top bg-ink-900 transition-transform duration-700"
                            style={{ transform: `scaleY(${i < active ? 1 : 0})` }}
                          />
                        </span>
                      )}
                    </div>

                    <div
                      className={`pb-4 transition-opacity duration-500 lg:max-w-[520px] ${
                        on ? "opacity-100" : "lg:opacity-40"
                      }`}
                    >
                      <h3 className="text-[1.625rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.25rem]">
                        {step.title}
                      </h3>
                      <p className="mt-4 text-[1.0625rem] leading-[1.7] text-ink-700">
                        {step.lead}
                      </p>
                      <ul className="mt-6 flex flex-wrap gap-2">
                        {step.points.map((p) => (
                          <li
                            key={p}
                            className="rounded-full bg-white px-4 py-2 text-[0.875rem] text-ink-700"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>

                      {/* Phones and tablets: the screen sits with its step */}
                      <div className="mt-8 rounded-[32px] border border-white bg-white/70 px-6 pt-8 lg:hidden">
                        <div className="mx-auto h-[400px] w-[240px] overflow-hidden sm:h-[460px] sm:w-[270px]">
                          <PhoneFrame dark={step.key === "cook"}>
                            <JourneyScreen step={step.key} />
                          </PhoneFrame>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Desktop: one sticky phone */}
          <div className="hidden lg:block">
            <div className="sticky top-[12vh]">
              <div
                className={`rounded-[40px] px-12 pt-12 transition-colors duration-700 ${
                  dark ? "bg-ink-900" : "bg-white"
                }`}
              >
                <div className="h-[600px] overflow-hidden">
                  <PhoneFrame dark={dark} className="mx-auto w-[300px]">
                    <div key={current.key} className="screen-in flex flex-1 flex-col">
                      <JourneyScreen step={current.key as JourneyKey} />
                    </div>
                  </PhoneFrame>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between px-2 text-[0.875rem] text-ink-600">
                <span className="tnum">
                  {current.number} / 0{JOURNEY.length}
                </span>
                <span className="flex gap-1.5">
                  {JOURNEY.map((s, i) => (
                    <span
                      key={s.key}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === active ? "w-6 bg-ink-900" : "w-1.5 bg-white"
                      }`}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
