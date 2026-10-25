"use client";

import { MapPin } from "lucide-react";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { STORIES, type PhotoKey } from "./content";
import { Reveal, useInView } from "./motion";
import { Photo } from "./Texture";
import { Band, Eyebrow, SectionHead } from "./ui";

const DURATION_MS = 11000;

/**
 * Three illustrative case studies. Tabs auto-advance like stories (a bar
 * fills, then the next opens) only while the section is on screen and
 * nobody is hovering or focused inside. Reduced motion: no auto-advance.
 */
export function Stories() {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>({
    once: false,
    rootMargin: "-20% 0px -20% 0px",
  });
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const story = STORIES[index];
  const photo = story.photo as PhotoKey;
  const paused = held || !inView;

  const go = (i: number, focus = false) => {
    const next = (i + STORIES.length) % STORIES.length;
    setIndex(next);
    if (focus) tabs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1, true);
    if (e.key === "ArrowLeft") go(index - 1, true);
  };

  return (
    <Band id="stories" labelledBy="stories-title" innerClassName="py-20 sm:py-28 lg:py-36">
      <Reveal>
        <SectionHead
          id="stories-title"
          eyebrow={<Eyebrow>Stories from the stove</Eyebrow>}
          title="Three first times."
          tail="None of them a disaster."
          lead="Illustrative stories. The people are composites; every feature they use is real."
        />
      </Reveal>

      <div
        ref={ref}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setHeld(false);
        }}
        className="mt-14 lg:mt-20"
      >
        <div
          role="tablist"
          aria-label="Stories"
          className="mx-auto grid max-w-[560px] grid-cols-3 gap-1 rounded-full bg-ink-900/[0.035] p-1 shadow-[inset_0_0_0_1px_var(--hair)]"
          onKeyDown={onKey}
        >
          {STORIES.map((s, i) => {
            const on = i === index;
            return (
              <button
                key={s.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`story-tab-${s.id}`}
                aria-selected={on}
                aria-controls={`story-panel-${s.id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => go(i)}
                className={`relative min-h-[44px] overflow-hidden rounded-full px-3 text-[0.9375rem] transition-colors ${
                  on
                    ? "bg-white text-ink-900 shadow-[0_0_0_1px_var(--hair),0_1px_3px_rgb(21_18_15/0.08)]"
                    : "text-ink-500 hover:text-ink-900"
                }`}
              >
                {on && (
                  <span
                    key={`fill-${index}`}
                    aria-hidden
                    className="story-fill absolute inset-x-6 bottom-1 h-[2px] rounded-full bg-primary-500"
                    data-paused={paused}
                    style={{ "--dur": `${DURATION_MS}ms` } as CSSProperties}
                    onAnimationEnd={() => go(index + 1)}
                  />
                )}
                <span className="relative">{s.name}</span>
              </button>
            );
          })}
        </div>

        <div
          key={story.id}
          role="tabpanel"
          id={`story-panel-${story.id}`}
          aria-labelledby={`story-tab-${story.id}`}
          className="mt-8 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
        >
          {/* Photo, with the outcome set on it like a receipt */}
          <div className="frame screen-in flex">
            <div className="relative min-h-[440px] flex-1 overflow-hidden rounded-[18px] lg:min-h-[620px]">
              <div className="absolute inset-0">
                <Photo name={photo} sizes="(min-width: 1024px) 560px, 100vw" />
              </div>
              <div className="lift absolute inset-x-3 bottom-3 grid grid-cols-3 divide-x divide-line-default rounded-[16px] bg-white">
                {story.receipt.map(([label, value]) => (
                  <div key={label} className="px-4 py-4">
                    <p className="whitespace-nowrap text-[1.125rem] tracking-[-0.02em] tnum sm:text-[1.375rem]">
                      {value}
                    </p>
                    <p className="mt-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-500">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <article className="frame screen-in" style={{ "--d": "80ms" } as CSSProperties}>
              <div className="panel p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1">
                    <MapPin size={13} aria-hidden /> {story.place}
                  </span>
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-primary-700">
                    {story.dish}
                  </span>
                </div>
                <h3 className="mt-5 text-[1.625rem] font-normal leading-[1.15] tracking-[-0.025em] sm:text-[2rem]">
                  {story.hook}
                </h3>
                <dl className="mt-6 flex flex-col">
                  {(
                    [
                      ["Before", story.before],
                      ["With Fork", story.turn],
                      ["After", story.after],
                    ] as const
                  ).map(([label, text], i) => (
                    <div
                      key={label}
                      className="screen-in grid gap-1 border-t border-dashed border-line-strong py-4 sm:grid-cols-[120px_1fr] sm:gap-5"
                      style={{ "--d": `${180 + i * 110}ms` } as CSSProperties}
                    >
                      <dt className="pt-0.5 font-mono text-[0.75rem] uppercase tracking-[0.06em] text-ink-500">
                        {label}
                      </dt>
                      <dd
                        className={`text-[1rem] leading-[1.65] ${i === 2 ? "text-ink-900" : "text-ink-600"}`}
                      >
                        {text}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>

            <div className="frame screen-in" style={{ "--d": "160ms" } as CSSProperties}>
              <div className="px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                <p className="text-[0.9375rem]">As it happened</p>
                <ol className="mt-4 flex flex-col">
                  {story.timeline.map((t, i) => {
                    const last = i === story.timeline.length - 1;
                    return (
                      <li
                        key={t.time}
                        className="screen-in grid grid-cols-[72px_18px_1fr] gap-3"
                        style={{ "--d": `${260 + i * 110}ms` } as CSSProperties}
                      >
                        <span className="pt-0.5 font-mono text-[0.75rem] text-ink-500 tnum">
                          {t.time}
                        </span>
                        <span className="flex flex-col items-center">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              last ? "bg-primary-500" : "bg-ink-900"
                            }`}
                          />
                          {!last && <span className="w-px flex-1 bg-line-strong" />}
                        </span>
                        <span className={`text-[0.9375rem] leading-snug ${last ? "" : "pb-4"}`}>
                          {t.text}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Band>
  );
}
