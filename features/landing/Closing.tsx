"use client";

import { ChevronsUp } from "lucide-react";
import Link from "next/link";
import { ForkLogo, PIN_PATH } from "@/shared/ui/Logo";
import type { PhotoKey } from "./content";
import { Reveal, useInView } from "./motion";
import { Photo } from "./Texture";
import { Band, Eyebrow, PillCta, TextCta } from "./ui";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Open the app" },
      { href: "/recipes", label: "Explore recipes" },
      { href: "/lists", label: "Shopping list" },
      { href: "/saved", label: "Saved" },
    ],
  },
  {
    title: "Start with",
    links: [
      { href: "/recipes/jollof-rice", label: "Party jollof rice" },
      { href: "/recipes/egusi-soup", label: "Egusi soup" },
      { href: "/recipes/efo-riro", label: "Efo riro" },
      { href: "/recipes/moi-moi", label: "Moi moi" },
    ],
  },
  {
    title: "On this page",
    links: [
      { href: "#how", label: "How it works" },
      { href: "#try", label: "Kitchen Check" },
      { href: "#stories", label: "Stories" },
      { href: "#cooking", label: "Cooking Mode" },
      { href: "#faq", label: "FAQ" },
    ],
  },
];

/** Oversized pin outlines, the logo's shape as quiet line art (after the mark's own path). */
function FooterLines() {
  const { ref, inView } = useInView<SVGSVGElement>({ rootMargin: "0px 0px -20% 0px" });
  return (
    <svg
      ref={ref}
      data-in={inView}
      aria-hidden
      viewBox="0 0 64 64"
      fill="none"
      className="draw pointer-events-none absolute -right-24 -top-16 -z-10 h-[620px] w-[620px] sm:-right-10 lg:right-[4%]"
    >
      <path pathLength={1} d={PIN_PATH} stroke="rgb(255 255 255 / 0.09)" strokeWidth="0.12" />
      <path
        pathLength={1}
        d={PIN_PATH}
        stroke="rgb(255 255 255 / 0.07)"
        strokeWidth="0.15"
        transform="translate(14 22) scale(0.56)"
      />
      <path
        pathLength={1}
        d={PIN_PATH}
        stroke="rgb(240 87 26 / 0.35)"
        strokeWidth="0.25"
        transform="translate(23.5 34) scale(0.27)"
      />
    </svg>
  );
}

export function Closing() {
  return (
    <footer>
      {/* Last call */}
      <Band labelledBy="closing-title" innerClassName="pt-20 sm:pt-28 lg:pt-36">
        <Reveal className="flex flex-col items-center text-center [&_.eyebrow]:items-center">
          <Eyebrow>Tonight, maybe?</Eyebrow>
          <h2
            id="closing-title"
            className="mt-6 max-w-[820px] font-headline text-[2.75rem] font-medium leading-[0.98] tracking-[-0.02em] sm:text-[4rem] lg:text-[5rem]"
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

      {/* Footer: a dark card inset like the hero, the pin drawn as line art behind it. */}
      <div className="p-2 pt-10 sm:p-3 sm:pt-16">
        <div className="relative isolate overflow-hidden rounded-[20px] bg-ink-900 text-white sm:rounded-[28px]">
          <FooterLines />

          <div className="mx-auto max-w-[1200px] px-6 sm:px-10 lg:px-14">
            <div className="flex flex-col gap-4 border-b border-white/10 py-10 sm:flex-row sm:items-center sm:justify-between">
              <ForkLogo size={34} wordClassName="text-white" />
              <p className="font-headline text-[1.25rem] font-medium tracking-[-0.01em] text-white/85 sm:text-[1.375rem]">
                Cook it yourself. We’ll be right beside you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-12 py-12 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-8">
              <div className="col-span-2 flex flex-col items-start gap-8 sm:col-span-3 lg:col-span-1">
                <p className="max-w-[340px] text-[1rem] leading-[1.65] text-white/75">
                  A step-by-step cooking companion for Nigerian food. Made for kitchens in Lagos,
                  London and everywhere in between.
                </p>
                <a
                  href="#top"
                  className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-[10px] px-4 font-label text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-inset ring-white/30 transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.06] hover:ring-white/60 active:scale-[0.97]"
                >
                  <ChevronsUp
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden
                    className="transition-transform duration-300 group-hover:-translate-y-0.5"
                  />
                  Back to top
                </a>
              </div>
              {FOOTER_COLUMNS.map((col, i) => (
                <Reveal as="nav" key={col.title} aria-label={col.title} delay={80 + i * 90}>
                  <p className="font-label text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white">
                    {col.title}
                  </p>
                  <ul className="mt-4 flex flex-col">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="inline-flex min-h-[40px] items-center text-[0.9375rem] text-white/75 underline-offset-4 transition-[color,translate] duration-200 ease-out hover:translate-x-1 hover:text-white hover:underline active:translate-x-1 active:text-white"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 py-6 font-label text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-white/70 sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} Fork</span>
              <span>Recipes checked by people. Never generated.</span>
            </div>
          </div>

          <div aria-hidden className="h-2 bg-primary-600" />
        </div>
      </div>
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
