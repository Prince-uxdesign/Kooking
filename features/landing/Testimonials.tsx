"use client";

import { Info } from "lucide-react";
import { TESTIMONIALS } from "./content";
import { Reveal } from "./motion";
import { Band, Eyebrow, SectionHead } from "./ui";

type T = (typeof TESTIMONIALS)[number];

/** Warm, muted avatar tones (no photos: these voices are composites). */
const TONES = ["#F6D9C4", "#E3E8D3", "#EADBD0", "#DCE3EA", "#F2DDD6", "#ECE4CF"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function Card({ t, i }: { t: T; i: number }) {
  return (
    <figure className="frame flex w-[300px] shrink-0 sm:w-[400px]">
      <div className="panel flex flex-1 flex-col p-6 sm:p-7">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-500">
          {t.cooked}
        </p>
        <p className="mt-4 text-[1.125rem] tracking-[-0.015em] sm:text-[1.25rem]">{t.title}</p>
        <blockquote className="mt-3 flex-1 text-[0.9375rem] leading-[1.65] text-ink-500">
          {t.body}
        </blockquote>
        <figcaption className="mt-7 flex items-center gap-3 border-t border-dashed border-line-strong pt-5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full text-[0.75rem] font-medium text-ink-800"
            style={{ background: TONES[i % TONES.length] }}
          >
            {initials(t.name)}
          </span>
          <span className="text-[0.9375rem]">
            {t.name}
            <span className="text-ink-500"> · {t.place}</span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}

function Row({ items, reverse = false }: { items: readonly T[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee fade-x overflow-hidden">
      <ul
        className="marquee-track flex w-max gap-3 py-1"
        data-reverse={reverse}
        style={{ animationDuration: "90s" }}
      >
        {doubled.map((t, i) => (
          <li key={`${t.name}-${i}`} aria-hidden={i >= items.length} className="flex">
            <Card t={t} i={TESTIMONIALS.indexOf(t)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Testimonials() {
  const half = Math.ceil(TESTIMONIALS.length / 2);
  return (
    <Band id="voices" labelledBy="voices-title" innerClassName="py-20 sm:py-28 lg:py-36">
      <Reveal className="flex flex-col items-center">
        <SectionHead
          id="voices-title"
          eyebrow={<Eyebrow tone="ink">Voices</Eyebrow>}
          title="What cooking with Fork"
          tail="sounds like."
          lead="The kind of cooks Fork is built for, and the small moments where it earns its place on the counter."
        />
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[0.8125rem] text-ink-500 shadow-[inset_0_0_0_1px_var(--hair)]">
          <Info size={14} aria-hidden />
          Illustrative voices, written from real cooking problems. Real reviews come at launch.
        </p>
      </Reveal>

      <div className="-mx-5 mt-14 flex flex-col gap-3 sm:-mx-8 sm:mt-16 lg:-mx-14">
        <Row items={TESTIMONIALS.slice(0, half)} />
        <Row items={TESTIMONIALS.slice(half)} reverse />
      </div>
    </Band>
  );
}
