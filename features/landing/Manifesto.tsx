"use client";

import { MANIFESTO, type PhotoKey } from "./content";
import { Reveal, usePrefersReducedMotion, useScrollProgress } from "./motion";
import { Photo } from "./Texture";
import { Band, Eyebrow, Index } from "./ui";

const STRIP: Array<{ photo: PhotoKey; label: string }> = [
  { photo: "jollof", label: "Party jollof" },
  { photo: "chopping", label: "Prep, with a plan" },
  { photo: "egusi", label: "Egusi with assorted" },
  { photo: "boli", label: "Roadside boli" },
  { photo: "puffpuff", label: "Puff-puff" },
  { photo: "market", label: "Market run" },
  { photo: "soup", label: "Pepper soup nights" },
  { photo: "grill", label: "Suya on the grill" },
];

/** A slow river of framed photos. Pauses on hover; still under reduced motion. */
export function DishMarquee() {
  const row = [...STRIP, ...STRIP];
  return (
    <Band label="Food Fork is built for" innerClassName="py-12 sm:py-16">
      <p className="flex items-center justify-center gap-2 text-[0.875rem] text-ink-500">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
        Built for the food you actually grew up on
      </p>
      <div className="marquee fade-x relative -mx-5 mt-8 overflow-hidden sm:-mx-8 lg:-mx-14">
        <ul className="marquee-track flex w-max gap-3" style={{ animationDuration: "80s" }}>
          {row.map((item, i) => (
            <li
              key={`${item.photo}-${i}`}
              aria-hidden={i >= STRIP.length}
              className="frame group w-[190px] shrink-0 sm:w-[230px]"
            >
              <div className="h-[200px] overflow-hidden rounded-[16px] sm:h-[250px]">
                <Photo
                  name={item.photo}
                  sizes="240px"
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5 pt-2.5">
                <span className="truncate text-[0.875rem]">{item.label}</span>
                <Index>{String((i % STRIP.length) + 1).padStart(2, "0")}</Index>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Band>
  );
}

/**
 * The problem, stated once, editorial-style: type that inks in as it
 * scrolls, then three framed photos set like a magazine spread.
 */
export function Manifesto() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>(0.85, 0.25);
  const words = MANIFESTO.split(" ");
  const reduced = usePrefersReducedMotion();
  const lit = reduced ? words.length : Math.round(progress * words.length);
  const turn = words.indexOf("Fork");

  return (
    <Band label="The problem with most recipes" innerClassName="py-20 sm:py-28 lg:py-36">
      <div ref={ref}>
        <Eyebrow tone="ink">The problem with most recipes</Eyebrow>
        <p className="mt-8 max-w-[1040px] font-display text-[1.875rem] font-normal leading-[1.18] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.25rem]">
          {words.map((w, i) => (
            <span
              key={i}
              className={`transition-colors duration-300 ${
                i < lit ? (i >= turn ? "text-ink-900" : "text-ink-400") : "text-ink-300/70"
              }`}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-3 sm:mt-24 lg:grid-cols-[1fr_2.1fr_1.1fr] lg:items-end">
        <Reveal className="order-2 lg:order-1 lg:pb-24">
          <div className="frame">
            <div className="h-[190px] overflow-hidden rounded-[16px] sm:h-[250px]">
              <Photo name="egusi" sizes="(min-width: 1024px) 260px, 50vw" />
            </div>
          </div>
        </Reveal>
        <Reveal delay={100} className="order-1 col-span-2 lg:order-2 lg:col-span-1">
          <div className="frame">
            <div className="h-[300px] overflow-hidden rounded-[16px] sm:h-[460px]">
              <Photo name="chopping" sizes="(min-width: 1024px) 560px, 100vw" />
            </div>
          </div>
        </Reveal>
        <Reveal delay={200} className="order-3 flex flex-col gap-5">
          <div className="frame">
            <div className="h-[190px] overflow-hidden rounded-[16px] sm:h-[210px]">
              <Photo name="jollof" sizes="(min-width: 1024px) 300px, 50vw" />
            </div>
          </div>
          <p className="px-1 text-[1rem] leading-[1.65] text-ink-500">
            Wherever you cook, and whoever taught you (or didn’t), Fork turns a recipe into a plan
            you can actually follow.
          </p>
        </Reveal>
      </div>
    </Band>
  );
}
