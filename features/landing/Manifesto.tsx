"use client";

import { MANIFESTO, type PhotoKey } from "./content";
import { Reveal, usePrefersReducedMotion, useScrollProgress } from "./motion";
import { Credit, Photo } from "./Texture";

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

/** A slow river of photos. Pauses on hover; still under reduced motion. */
export function DishMarquee() {
  const row = [...STRIP, ...STRIP];
  return (
    <section aria-label="Food Kooking is built for" className="py-16 sm:py-24">
      <div className="marquee relative overflow-hidden">
        <ul className="marquee-track flex w-max gap-4" style={{ animationDuration: "70s" }}>
          {row.map((item, i) => (
            <li
              key={`${item.photo}-${i}`}
              aria-hidden={i >= STRIP.length}
              className="group relative h-[220px] w-[180px] shrink-0 overflow-hidden rounded-[24px] sm:h-[300px] sm:w-[240px]"
            >
              <Photo
                name={item.photo}
                sizes="240px"
                className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-medium">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The problem, stated once, editorial-style: two-tone type that inks in
 * as it scrolls, then three photos set off-grid like a magazine spread.
 */
export function Manifesto() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>(0.85, 0.25);
  const words = MANIFESTO.split(" ");
  const reduced = usePrefersReducedMotion();
  const lit = reduced ? words.length : Math.round(progress * words.length);
  const turn = words.indexOf("Kooking");

  return (
    <section className="px-5 pb-24 sm:px-6 sm:pb-32 lg:px-10 lg:pb-40">
      <div className="mx-auto max-w-[1180px]">
        <div ref={ref}>
          <p className="mb-6 text-[1rem] text-ink-500">{"{The problem with most recipes}"}</p>
          <p className="max-w-[1000px] text-[1.875rem] font-bold leading-[1.2] tracking-[-0.03em] sm:text-[2.75rem] lg:text-[3.25rem]">
            {words.map((w, i) => (
              <span
                key={i}
                className={`transition-colors duration-300 ${
                  i < lit ? (i >= turn ? "text-ink-900" : "text-ink-500") : "text-ink-300"
                }`}
              >
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:mt-24 lg:grid-cols-[1fr_2.1fr_1.1fr] lg:items-end lg:gap-5">
          <Reveal className="order-2 lg:order-1 lg:pb-24">
            <div className="h-[200px] overflow-hidden rounded-[24px] sm:h-[260px]">
              <Photo name="egusi" sizes="(min-width: 1024px) 260px, 50vw" />
            </div>
            <Credit name="egusi" className="mt-2 inline-block" />
          </Reveal>
          <Reveal delay={100} className="col-span-2 order-1 lg:order-2 lg:col-span-1">
            <div className="h-[300px] overflow-hidden rounded-[32px] sm:h-[460px]">
              <Photo name="chopping" sizes="(min-width: 1024px) 560px, 100vw" />
            </div>
            <Credit name="chopping" className="mt-2 inline-block" />
          </Reveal>
          <Reveal delay={200} className="order-3 flex flex-col gap-5">
            <div className="h-[200px] overflow-hidden rounded-[24px] sm:h-[220px]">
              <Photo name="jollof" sizes="(min-width: 1024px) 300px, 50vw" />
            </div>
            <p className="text-[1rem] leading-[1.65] text-ink-600">
              Wherever you cook, and whoever taught you (or didn’t), Kooking turns a recipe into a
              plan you can actually follow.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
