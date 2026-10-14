"use client";

import { MapPin } from "lucide-react";
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { STORIES, type PhotoKey } from "./content";
import { Reveal, useInView } from "./motion";
import { Credit, Highlight, Photo } from "./Texture";

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
    <section
      id="stories"
      aria-labelledby="stories-title"
      className="px-5 pb-28 sm:px-6 sm:pb-36 lg:px-10 lg:pb-44"
    >
      <div className="mx-auto max-w-[1180px]">
        <Reveal className="mx-auto max-w-[820px] text-center">
          <p className="text-[1rem] text-ink-500">{"{Stories from the stove}"}</p>
          <h2
            id="stories-title"
            className="mt-3 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3.25rem] lg:text-[4rem]"
          >
            Three first times. None of them <Highlight>a disaster.</Highlight>
          </h2>
          <p className="mx-auto mt-6 max-w-[520px] text-[1rem] leading-relaxed text-ink-500">
            Illustrative stories. The people are composites; every feature they use is real.
          </p>
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
            className="mx-auto grid max-w-[720px] grid-cols-3 gap-2 rounded-full border border-line-default bg-white p-1.5"
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
                  className={`relative min-h-[48px] overflow-hidden rounded-full px-3 text-[0.9375rem] font-medium transition-colors ${
                    on ? "bg-ink-900 text-white" : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {on && (
                    <span
                      key={`fill-${index}`}
                      aria-hidden
                      className="story-fill absolute inset-x-5 bottom-1.5 h-[2px] rounded-full bg-primary-500"
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
            className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
          >
            {/* Photo, with the outcome set on it like a receipt */}
            <div className="screen-in relative min-h-[420px] overflow-hidden rounded-[32px] lg:min-h-[600px]">
              <div className="absolute inset-0">
                <Photo name={photo} sizes="(min-width: 1024px) 560px, 100vw" />
              </div>
              <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 rounded-[24px] bg-white p-1.5">
                {story.receipt.map(([label, value]) => (
                  <div key={label} className="rounded-[18px] px-4 py-4">
                    <p className="text-[1.5rem] font-extrabold tracking-[-0.03em] tnum sm:text-[1.75rem]">
                      {value}
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <article
                className="screen-in rounded-[32px] border border-line-default bg-white p-6 sm:p-9"
                style={{ "--d": "80ms" } as CSSProperties}
              >
                <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1.5">
                    <MapPin size={14} aria-hidden /> {story.place}
                  </span>
                  <span className="rounded-full bg-primary-100 px-3 py-1.5 text-primary-800">
                    {story.dish}
                  </span>
                </div>
                <h3 className="mt-5 text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-[2.25rem]">
                  {story.hook}
                </h3>
                <dl className="mt-7 grid gap-5">
                  {(
                    [
                      ["Before", story.before],
                      ["With Kooking", story.turn],
                      ["After", story.after],
                    ] as const
                  ).map(([label, text], i) => (
                    <div
                      key={label}
                      className="screen-in grid gap-1 sm:grid-cols-[112px_1fr] sm:gap-5"
                      style={{ "--d": `${180 + i * 110}ms` } as CSSProperties}
                    >
                      <dt className="text-[0.875rem] font-medium text-ink-500">{label}</dt>
                      <dd
                        className={`text-[1rem] leading-[1.65] ${i === 2 ? "text-ink-900" : "text-ink-700"}`}
                      >
                        {text}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>

              <div
                className="screen-in rounded-[32px] border border-line-default bg-surface-50 p-6 sm:p-8"
                style={{ "--d": "160ms" } as CSSProperties}
              >
                <p className="text-[0.875rem] font-medium text-ink-600">As it happened</p>
                <ol className="mt-4 flex flex-col">
                  {story.timeline.map((t, i) => {
                    const last = i === story.timeline.length - 1;
                    return (
                      <li
                        key={t.time}
                        className="screen-in grid grid-cols-[68px_18px_1fr] gap-3"
                        style={{ "--d": `${260 + i * 110}ms` } as CSSProperties}
                      >
                        <span className="pt-0.5 text-[0.8125rem] text-ink-500 tnum">{t.time}</span>
                        <span className="flex flex-col items-center">
                          <span
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
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
              <Credit name={photo} className="px-2" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
