"use client";

import { Plus } from "lucide-react";
import { FAQ } from "./content";
import { Reveal } from "./motion";
import { Band, Eyebrow, Index, SectionHead } from "./ui";

export function Faq() {
  return (
    <Band id="faq" labelledBy="faq-title" innerClassName="py-20 sm:py-28 lg:py-36">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionHead
            id="faq-title"
            align="left"
            eyebrow={<Eyebrow tone="ink">Questions</Eyebrow>}
            title="Before you put"
            tail="the pot on."
            lead="Still unsure? Open Fork and look around. Nothing asks for an email."
          />
        </Reveal>
        <div className="flex flex-col border-b border-line-default">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group border-t border-line-default [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-[72px] cursor-pointer list-none items-center gap-5 py-5 text-[1.0625rem] transition-colors hover:text-ink-600">
                  <Index>{String(i + 1).padStart(2, "0")}</Index>
                  <span className="flex-1">{f.q}</span>
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--hair)] transition-all duration-300 group-open:rotate-45 group-open:bg-primary-500 group-open:shadow-none"
                  >
                    <Plus size={16} />
                  </span>
                </summary>
                <p className="max-w-[600px] pb-6 pl-[52px] pr-12 text-[1rem] leading-[1.7] text-ink-500">
                  {f.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </Band>
  );
}
