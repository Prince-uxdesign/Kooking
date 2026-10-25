"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ForkLogo } from "@/shared/ui/Logo";
import type { PhotoKey } from "./content";
import { Reveal, useInView } from "./motion";
import { Photo } from "./Texture";
import { Band, Eyebrow, PillCta, TextCta } from "./ui";

const FOOTER_LINKS = [
  { href: "/", label: "Open the app" },
  { href: "/recipes", label: "Explore recipes" },
  { href: "/lists", label: "Shopping list" },
  { href: "/saved", label: "Saved" },
];

const START_WITH = [
  { href: "/recipes/jollof-rice", label: "Party jollof rice" },
  { href: "/recipes/egusi-soup", label: "Egusi soup" },
  { href: "/recipes/efo-riro", label: "Efo riro" },
  { href: "/recipes/moi-moi", label: "Moi moi" },
];

export function Closing() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "0px 0px -5% 0px" });
  const letters = "fork".split("");

  return (
    <footer>
      {/* Last call */}
      <Band labelledBy="closing-title" innerClassName="pt-20 sm:pt-28 lg:pt-36">
        <Reveal className="flex flex-col items-center text-center">
          <Eyebrow>Tonight, maybe?</Eyebrow>
          <h2
            id="closing-title"
            className="mt-6 max-w-[820px] font-display text-[2.75rem] font-normal leading-[1] tracking-[-0.025em] sm:text-[4rem] lg:text-[5rem]"
          >
            Cook it yourself. <span className="text-primary-600">We’ll be right beside you.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[440px] text-[1.0625rem] leading-[1.6] text-ink-500">
            No account, no download. Open Fork, pick a recipe, and start with Kitchen Check.
          </p>
          <div className="mt-9 flex flex-col items-center gap-2 sm:flex-row">
            <PillCta href="/">Start cooking, free</PillCta>
            <TextCta href="/recipes">Browse recipes</TextCta>
          </div>
        </Reveal>

        <Reveal
          delay={120}
          className="mt-16 grid grid-cols-[1fr_2.4fr_1fr] items-end gap-3 pb-3 sm:mt-20"
        >
          <ClosingDish name="jollof" className="h-[150px] sm:h-[260px]" />
          <div className="frame">
            <div className="h-[260px] overflow-hidden rounded-[16px] sm:h-[420px]">
              <Photo name="sink" sizes="(min-width: 1024px) 640px, 60vw" />
            </div>
          </div>
          <ClosingDish name="puffpuff" className="h-[150px] sm:h-[260px]" />
        </Reveal>
      </Band>

      {/* Footer */}
      <Band innerClassName="pt-14">
        <div className="grid gap-10 pb-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <ForkLogo size={32} />
            <p className="mt-4 max-w-[320px] text-[0.9375rem] leading-relaxed text-ink-500">
              A step-by-step cooking companion for Nigerian food. Made for kitchens in Lagos, London
              and everywhere in between.
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-400">
              Product
            </p>
            <ul className="mt-3 flex flex-col">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-[36px] items-center text-[0.9375rem] text-ink-600 transition-colors hover:text-ink-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Recipes to start with">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-400">
              Start with
            </p>
            <ul className="mt-3 flex flex-col">
              {START_WITH.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-[36px] items-center text-[0.9375rem] text-ink-600 transition-colors hover:text-ink-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Wordmark: letters rise in one after another */}
        <div ref={ref} data-in={inView} aria-hidden className="overflow-hidden">
          <p className="select-none pb-[0.16em] text-center font-display text-[34vw] leading-[0.8] tracking-[-0.045em] text-ink-900 lg:text-[24rem]">
            {letters.map((l, i) => (
              <span key={i} className="letter" style={{ "--d": `${i * 70}ms` } as CSSProperties}>
                {l}
              </span>
            ))}
            <span
              className="letter text-primary-500"
              style={{ "--d": `${letters.length * 70}ms` } as CSSProperties}
            >
              .
            </span>
          </p>
        </div>
      </Band>

      <Band innerClassName="py-6">
        <div className="flex flex-col gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Fork</span>
          <span>Recipes checked by people. Never generated.</span>
        </div>
      </Band>
    </footer>
  );
}

function ClosingDish({ name, className }: { name: PhotoKey; className: string }) {
  return (
    <div aria-hidden className="frame">
      <div className={`overflow-hidden rounded-[16px] ${className}`}>
        <Photo name={name} sizes="300px" />
      </div>
    </div>
  );
}
