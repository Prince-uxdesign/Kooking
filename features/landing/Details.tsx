"use client";

import { Check, Plus, UserRound, WifiOff, X } from "lucide-react";
import { formatQuantity, scaleAmount } from "@/shared/domain/units";
import { FAQ } from "./content";
import { Reveal, useCycle, useInView } from "./motion";
import { Highlight, Photo, Wash } from "./Texture";

const SERVINGS = [2, 4, 6, 12];
const SCALE_LINES = [
  { name: "Rice", amount: 500, unit: "g" as const },
  { name: "Chicken stock", amount: 750, unit: "ml" as const },
  { name: "Tomato paste", amount: 70, unit: "g" as const },
];

function ServingsCard() {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false });
  const [i] = useCycle(SERVINGS.length, 2200, inView);
  const n = SERVINGS[i];
  return (
    <div ref={ref} className="flex h-full flex-col justify-between gap-10 sm:flex-row sm:items-end">
      <div className="max-w-[300px]">
        <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em]">
          Cooking for two, or twelve.
        </h3>
        <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-500">
          Change the servings and every quantity rescales, rounded the way a cook would round it.
          Timers stay put. Rice doesn’t steam faster for a crowd.
        </p>
      </div>
      <div aria-hidden className="w-full rounded-[24px] bg-surface-50 p-2 sm:w-[300px]">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[0.8125rem] text-ink-500">Serves</span>
          <span className="flex gap-1">
            {SERVINGS.map((s) => (
              <span
                key={s}
                className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[0.8125rem] tnum transition-colors duration-300 ${
                  s === n ? "bg-ink-900 text-white" : "text-ink-500"
                }`}
              >
                {s}
              </span>
            ))}
          </span>
        </div>
        {SCALE_LINES.map((l) => (
          <div
            key={l.name}
            className="flex items-center justify-between rounded-[16px] px-3 py-2.5 text-[0.9375rem]"
          >
            <span>{l.name}</span>
            <span key={`${l.name}-${n}`} className="word-in tnum">
              {formatQuantity(scaleAmount(l.amount, 4, n, "linear", l.unit).amount, l.unit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const card = "rounded-[32px] border border-white bg-white p-6 sm:p-8";

export function Details() {
  return (
    <section
      aria-labelledby="details-title"
      className="relative isolate px-5 py-28 sm:px-6 sm:py-36 lg:px-10 lg:py-44"
    >
      <Wash tone="cream" />
      <div className="mx-auto max-w-[1180px]">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <p className="text-[1rem] text-ink-600">{"{The details}"}</p>
          <h2
            id="details-title"
            className="mt-3 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3.25rem] lg:text-[4rem]"
          >
            Small things, <Highlight tone="cream">done properly.</Highlight>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-3 md:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          <Reveal className={`${card} md:col-span-2`}>
            <ServingsCard />
          </Reveal>

          <Reveal delay={80} className={`${card} flex flex-col justify-between gap-10`}>
            <div className="relative -mx-3 -mt-3 h-[200px] overflow-hidden rounded-[24px] sm:-mx-5 sm:-mt-5">
              <Photo name="market" sizes="(min-width: 1024px) 380px, 100vw" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.8125rem]">
                <WifiOff size={14} aria-hidden /> Offline
              </span>
            </div>
            <div>
              <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em]">
                No signal in the market? Fine.
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-500">
                Lists, Kitchen Check, Cooking Mode and recipes you’ve opened all work offline.
              </p>
            </div>
          </Reveal>

          <Reveal className={`${card} flex flex-col justify-between gap-10`}>
            <ul aria-label="Example swaps" className="flex flex-col gap-1.5 text-[0.9375rem]">
              <li className="flex items-center justify-between rounded-[18px] bg-surface-50 px-4 py-3">
                <span>Ugu → Spinach</span>
                <span className="inline-flex items-center gap-1 text-[0.8125rem] text-success-700">
                  <Check size={14} strokeWidth={2.25} aria-hidden /> Approved
                </span>
              </li>
              <li className="flex items-center justify-between rounded-[18px] bg-surface-50 px-4 py-3 text-ink-500">
                <span className="line-through">Crayfish → Shrimp paste</span>
                <span className="inline-flex items-center gap-1 text-[0.8125rem]">
                  <X size={14} aria-hidden /> Not on the list
                </span>
              </li>
            </ul>
            <div>
              <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em]">
                Swaps from the recipe, never a guess.
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-500">
                Each recipe carries its own approved swaps. Kooking never invents one.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80} className={`${card} flex flex-col justify-between gap-10`}>
            <div
              aria-hidden
              className="flex flex-col gap-1.5 rounded-[24px] bg-surface-50 p-2 text-[0.875rem]"
            >
              {[
                ["Scotch bonnet", "Party jollof · 6"],
                ["Ground egusi", "Egusi soup · 4"],
                ["Bread", "Your item"],
              ].map(([n, m]) => (
                <div key={n} className="flex items-center justify-between rounded-[16px] px-3 py-2">
                  <span>{n}</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] text-ink-600">
                    {m}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em]">
                One list for every pot.
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-500">
                Each item remembers which recipe and serving size it came from. Your own items sit
                right alongside.
              </p>
            </div>
          </Reveal>

          <Reveal delay={160} className={`${card} flex flex-col justify-between gap-10`}>
            <span className="flex items-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-100">
                <UserRound size={22} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="-ml-3 flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-white">
                <Plus size={20} aria-hidden />
              </span>
            </span>
            <div>
              <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em]">
                Open it. Cook. That’s the sign-up.
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-500">
                No account wall. Everything lives on your device until you choose to sync it.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="px-5 pb-24 sm:px-6 sm:pb-32 lg:px-10 lg:pb-40"
    >
      <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[1rem] text-ink-500">{"{Questions}"}</p>
          <h2
            id="faq-title"
            className="mt-3 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3.25rem]"
          >
            Before you put the pot on.
          </h2>
        </Reveal>
        <div className="flex flex-col gap-2">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group rounded-[24px] border border-line-default bg-white transition-colors hover:border-line-strong open:border-line-strong [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 rounded-[24px] px-6 py-4 text-[1.0625rem] font-medium">
                  {f.q}
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-100 transition-transform duration-300 group-open:rotate-45 group-open:bg-primary-500"
                  >
                    <Plus size={18} />
                  </span>
                </summary>
                <p className="px-6 pb-6 text-[1rem] leading-[1.7] text-ink-600">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
