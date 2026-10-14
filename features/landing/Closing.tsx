"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { buttonClasses } from "@/shared/ui/Button";
import { PHOTOS, type PhotoKey } from "./content";
import { Reveal, useInView } from "./motion";
import { Highlight, Photo } from "./Texture";

const FOOTER_LINKS = [
  { href: "/", label: "Open the app" },
  { href: "/recipes", label: "Explore recipes" },
  { href: "/lists", label: "Shopping list" },
  { href: "/saved", label: "Saved" },
];

/** One credit per photographer, as Unsplash asks. */
const CREDITS = [...new Map(Object.values(PHOTOS).map((p) => [p.by, p])).values()];

export function Closing() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "0px 0px -5% 0px" });
  const letters = "Kooking".split("");

  return (
    <footer className="px-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1180px]">
        {/* Last call: a real kitchen, one card, two dishes tucked in the corners */}
        <Reveal className="relative overflow-hidden rounded-[40px]">
          <div className="absolute inset-0">
            <Photo name="sink" sizes="(min-width: 1024px) 1180px, 100vw" />
          </div>
          <div className="relative flex min-h-[640px] items-end justify-center px-4 pb-6 pt-56 sm:min-h-[720px] sm:pb-10 sm:pt-72">
            <div className="relative w-full max-w-[520px] rounded-[32px] bg-white px-6 py-12 text-center sm:px-12">
              <ClosingDish name="jollof" className="-left-10 -top-12 rotate-[-8deg]" />
              <ClosingDish name="puffpuff" className="-bottom-12 -right-10 rotate-[7deg]" />
              <p className="text-[1rem] text-ink-500">{"{Tonight, maybe?}"}</p>
              <h2 className="mt-3 text-[1.875rem] font-extrabold leading-[1.08] tracking-[-0.04em] sm:text-[2.75rem]">
                Cook it yourself. We’ll be <Highlight>right beside you.</Highlight>
              </h2>
              <p className="mx-auto mt-5 max-w-[360px] text-[1rem] leading-[1.6] text-ink-600">
                No account, no download. Open Kooking, pick a recipe, and start with Kitchen Check.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/" className={buttonClasses({ size: "lg", className: "group" })}>
                  Start cooking
                  <ArrowRight
                    size={18}
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/recipes"
                  className={buttonClasses({
                    variant: "light",
                    size: "lg",
                    className: "border border-line-strong",
                  })}
                >
                  Browse recipes
                </Link>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-10 pb-6 pt-20 sm:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="text-[1.3rem] font-extrabold tracking-[-0.03em]">Kooking</p>
            <p className="mt-3 max-w-[320px] text-[0.9375rem] leading-relaxed text-ink-500">
              A step-by-step cooking companion for Nigerian food. Made for kitchens in Lagos, London
              and everywhere in between.
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="text-[0.875rem] font-semibold">Product</p>
            <ul className="mt-2 flex flex-col">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-[40px] items-center text-[0.9375rem] text-ink-600 transition-colors hover:text-ink-900"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-[0.875rem] font-semibold">Photography</p>
            <ul className="mt-3 flex flex-col gap-2 text-[0.8125rem] text-ink-500">
              {CREDITS.map((p) => (
                <li key={p.by}>
                  <a
                    href={`https://unsplash.com/${p.by}?utm_source=kooking&utm_medium=referral`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:text-ink-900 hover:underline"
                  >
                    {p.name}
                  </a>
                </li>
              ))}
              <li>
                via{" "}
                <a
                  href="https://unsplash.com/?utm_source=kooking&utm_medium=referral"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-ink-900"
                >
                  Unsplash
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Wordmark: letters rise in one after another */}
        <div ref={ref} data-in={inView} aria-hidden className="overflow-hidden pt-6">
          <p className="select-none pb-[0.24em] text-center text-[23vw] font-extrabold leading-[0.8] tracking-[-0.07em] lg:text-[17.5rem]">
            {letters.map((l, i) => (
              <span key={i} className="letter" style={{ "--d": `${i * 70}ms` } as CSSProperties}>
                {l}
              </span>
            ))}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-line-default py-8 text-[0.8125rem] text-ink-500 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Kooking</span>
          <span>Recipes checked by people. Never generated.</span>
        </div>
      </div>
    </footer>
  );
}

function ClosingDish({ name, className }: { name: PhotoKey; className: string }) {
  return (
    <div
      aria-hidden
      className={`absolute hidden h-28 w-28 overflow-hidden rounded-[24px] border-4 border-white sm:block ${className}`}
    >
      <Photo name={name} sizes="112px" />
    </div>
  );
}
