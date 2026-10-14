"use client";

import { CookingPot, Info, Utensils } from "lucide-react";
import { TESTIMONIALS } from "./content";
import { Reveal } from "./motion";

type T = (typeof TESTIMONIALS)[number];

/** Warm, muted avatar tones (no photos: these voices are composites). */
const TONES = ["#F2D7B6", "#CFE8D6", "#E7D3EC", "#D7E3F4", "#F4D9D2", "#E9E3C6"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function Card({ t, i }: { t: T; i: number }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col rounded-[28px] border border-white bg-surface-50 p-7 transition-colors duration-300 hover:bg-white sm:w-[440px] sm:p-10">
      <p className="text-[1.125rem] font-medium tracking-[-0.01em] sm:text-[1.25rem]">{t.title}</p>
      <p className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-white px-3 py-1 text-[0.8125rem] text-ink-600">
        <Utensils size={13} aria-hidden /> {t.cooked}
      </p>
      <blockquote className="mt-5 flex-1 text-[1rem] leading-[1.6] text-ink-700">
        {t.body}
      </blockquote>
      <figcaption className="mt-8 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full text-[0.8125rem] font-semibold text-ink-800"
          style={{ background: TONES[i % TONES.length] }}
        >
          {initials(t.name)}
        </span>
        <span className="text-[0.9375rem]">
          <span className="font-medium">{t.name}</span>
          <span className="text-ink-500"> · {t.place}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function Row({ items, reverse = false }: { items: readonly T[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee overflow-hidden">
      <ul
        className="marquee-track flex w-max gap-5 py-2"
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
    <section
      id="voices"
      aria-labelledby="voices-title"
      className="bg-surface-100 py-24 sm:py-32 lg:py-40"
    >
      <Reveal className="mx-auto flex max-w-[720px] flex-col items-center px-5 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-primary-500 text-ink-900">
          <CookingPot size={28} strokeWidth={2} aria-hidden />
        </span>
        <h2
          id="voices-title"
          className="mt-7 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3rem]"
        >
          What cooking with Kooking sounds like
        </h2>
        <p className="mt-4 max-w-[560px] text-[1.0625rem] leading-[1.6] text-ink-600 sm:text-[1.1875rem]">
          The kind of cooks Kooking is built for, and the small moments where it earns its place on
          the counter.
        </p>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-line-default bg-white px-4 py-2 text-[0.8125rem] text-ink-600">
          <Info size={14} aria-hidden />
          Illustrative voices, written from real cooking problems. Real reviews come at launch.
        </p>
      </Reveal>

      <div className="mt-14 flex flex-col gap-3 sm:mt-16">
        <Row items={TESTIMONIALS.slice(0, half)} />
        <Row items={TESTIMONIALS.slice(half)} reverse />
      </div>
    </section>
  );
}
