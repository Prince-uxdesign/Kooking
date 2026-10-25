"use client";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Heart,
  Mic,
  Pause,
  Play,
  Search,
  ShoppingBasket,
  Sun,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { COOK_STEPS, type JourneyKey } from "./content";
import { usePrefersReducedMotion } from "./motion";

/**
 * Product mockups. These are drawings of the real screens, built from the
 * same tokens, and are decorative: the surrounding copy carries the meaning,
 * so every mockup is aria-hidden.
 */

export function PhoneFrame({
  children,
  dark = false,
  className = "",
}: {
  children: React.ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={`rounded-[46px] bg-ink-900 p-[7px] ${className}`}>
      <div
        className={`relative flex aspect-[9/19] flex-col overflow-hidden rounded-[39px] ${
          dark ? "bg-ink-900 text-white" : "bg-white text-ink-900"
        }`}
      >
        <div className="flex h-9 shrink-0 items-center justify-between px-6 text-[11px] font-medium tnum">
          <span>9:41</span>
          <span className="h-[18px] w-[72px] rounded-full bg-ink-900" />
          <span className="flex items-center gap-1">
            <span className={`h-2 w-3.5 rounded-[3px] ${dark ? "bg-white" : "bg-ink-900"}`} />
          </span>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

/** Real dish photo from the shipped catalog. */
function Dish({ src, className = "" }: { src: string; className?: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      className={`block w-full bg-surface-200 object-cover ${className}`}
    />
  );
}

export function DiscoverScreen() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-2">
      <div>
        <p className="text-[10px] text-ink-500">Good evening</p>
        <p className="text-[17px] leading-tight tracking-tight">What would you like to cook?</p>
      </div>
      <div className="flex h-9 items-center gap-2 rounded-full bg-surface-100 pl-3 pr-1 text-[10px] text-ink-500">
        <Search size={12} strokeWidth={2} className="text-ink-900" />
        <span className="flex-1">Search for recipes</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white">
          <Search size={11} strokeWidth={2.25} />
        </span>
      </div>
      <div className="rounded-[18px] bg-surface-100 p-1">
        <Dish src="/images/recipes/jollof-rice.jpg" className="h-[92px] rounded-[14px]" />
        <div className="flex items-end justify-between px-2 pb-1.5 pt-2">
          <div>
            <p className="text-[12px]">Party Jollof Rice</p>
            <p className="font-mono text-[8px] uppercase text-ink-500">1 hr 20 min · Serves 6</p>
          </div>
          <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[8px] text-white">
            Featured
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-hidden">
        {["Rice", "Soups", "Stews", "Snacks"].map((c, i) => (
          <span
            key={c}
            className={`shrink-0 rounded-full px-2.5 py-1.5 text-[9px] ${
              i === 1 ? "bg-ink-900 text-white" : "bg-surface-100 text-ink-700"
            }`}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Egusi Soup", "1 hr 40", "/images/recipes/egusi-soup.jpg"],
          ["Moi Moi", "1 hr 55", "/images/recipes/moi-moi.jpg"],
        ].map(([t, m, src]) => (
          <div key={t} className="rounded-[14px] bg-surface-100 p-1">
            <Dish src={src} className="h-14 rounded-[11px]" />
            <p className="px-1.5 pt-1.5 text-[9.5px]">{t}</p>
            <p className="flex items-center gap-1 px-1.5 pb-1 font-mono text-[7.5px] text-ink-500">
              <Clock size={8} /> {m}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHECK_ROWS: Array<{ name: string; qty: string; state: "have" | "need" | "swap" }> = [
  { name: "Long-grain rice", qty: "750 g", state: "have" },
  { name: "Tomato paste", qty: "105 g", state: "swap" },
  { name: "Tatashe", qty: "3", state: "have" },
  { name: "Scotch bonnet", qty: "2", state: "need" },
  { name: "Onions", qty: "3", state: "have" },
  { name: "Chicken stock", qty: "1.1 l", state: "need" },
];

export function CheckScreen() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-1">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-100">
          <ChevronLeft size={13} />
        </span>
        <span className="text-[10px] text-ink-500">Party jollof · Serves 6</span>
      </div>
      <p className="text-[17px] leading-tight tracking-tight">Kitchen Check</p>
      <div className="rounded-[16px] bg-surface-100 p-3">
        <div className="flex items-baseline justify-between text-[10px]">
          <span className="font-medium">4 of 6 ready</span>
          <span className="text-ink-500">2 to buy</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-300">
          <div className="h-full w-2/3 rounded-full bg-primary-500" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {CHECK_ROWS.map((r, i) => (
          <div
            key={r.name}
            className={`screen-in flex items-center gap-2 rounded-[12px] px-2.5 py-2 text-[9.5px] ${
              r.state === "need" ? "bg-surface-100" : "bg-primary-100"
            }`}
            style={{ "--d": `${120 + i * 70}ms` } as React.CSSProperties}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                r.state === "need" ? "bg-white" : "bg-primary-600 text-white"
              }`}
            >
              {r.state !== "need" && <Check size={9} strokeWidth={3} />}
            </span>
            <span className="flex-1">{r.name}</span>
            <span className="text-ink-500 tnum">
              {r.state === "swap" ? "Purée ✓" : r.state === "need" ? `Need ${r.qty}` : r.qty}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex h-9 items-center justify-center rounded-full bg-ink-900 text-[10px] font-medium text-white">
        Add 2 to shopping list
      </div>
    </div>
  );
}

export function ShopScreen() {
  const [ticked, setTicked] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) {
      setTicked(2);
      return;
    }
    const id = window.setInterval(() => setTicked((t) => (t + 1) % 4), 1300);
    return () => window.clearInterval(id);
  }, [reduced]);
  const items = [
    { name: "Scotch bonnet", meta: "2 · Party jollof, 6 servings" },
    { name: "Chicken stock", meta: "1.1 l · Party jollof, 6 servings" },
    { name: "Bread", meta: "Your item" },
  ];
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-2">
      <p className="text-[17px] leading-tight tracking-tight">Shopping list</p>
      <div className="flex gap-1.5 text-[9px]">
        <span className="rounded-full bg-primary-600 px-2.5 py-1.5 text-white">To buy</span>
        <span className="rounded-full bg-surface-100 px-2.5 py-1.5 text-ink-700">Done</span>
      </div>
      <div className="flex flex-col gap-1.5 rounded-[18px] bg-surface-100 p-1.5">
        {items.map((it, i) => {
          const done = i < ticked;
          return (
            <div
              key={it.name}
              className="flex items-center gap-2.5 rounded-[13px] bg-white px-2.5 py-2"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-300 ${
                  done ? "bg-primary-500" : "bg-surface-200"
                }`}
              >
                {done && <Check size={9} strokeWidth={3} />}
              </span>
              <span className="flex-1">
                <span
                  className={`block text-[10px] transition-colors duration-300 ${
                    done ? "text-ink-400 line-through" : ""
                  }`}
                >
                  {it.name}
                </span>
                <span className="block text-[8px] text-ink-500">{it.meta}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex items-center gap-2 rounded-[14px] bg-surface-100 px-3 py-2.5 text-[9px] text-ink-600">
        <ShoppingBasket size={12} />
        Works offline in the market
      </div>
    </div>
  );
}

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Cooking Mode. `autoplay` cycles steps and ticks the timer. */
export function CookScreen({
  autoplay = false,
  step: fixedStep = 1,
}: {
  autoplay?: boolean;
  step?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(fixedStep);
  const [left, setLeft] = useState(COOK_STEPS[fixedStep].timer ?? 0);

  useEffect(() => {
    if (!autoplay || reduced) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % COOK_STEPS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [autoplay, reduced]);

  useEffect(() => setLeft(COOK_STEPS[step].timer ?? 0), [step]);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [reduced]);

  const s = COOK_STEPS[step];
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-1 text-white">
      <div className="flex items-center justify-between text-[9px] text-white/70">
        <span className="tnum">
          Step {step + 1} of {COOK_STEPS.length + 5}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
          <Sun size={9} /> Screen on
        </span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: COOK_STEPS.length + 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
              i <= step ? "bg-primary-500" : "bg-white/15"
            }`}
          />
        ))}
      </div>
      <div key={step} className="screen-in flex flex-col gap-2.5">
        <p className="text-[10px] text-white/60">{s.title}</p>
        <p className="text-[15px] font-medium leading-snug">{s.body}</p>
        <span className="self-start rounded-full bg-primary-600 px-2.5 py-1 text-[9px] font-medium text-white">
          {s.quantity}
        </span>
        <div className="rounded-[14px] bg-white/10 p-2.5">
          <p className="text-[8px] text-white/60">Ready when</p>
          <p className="text-[10px] leading-snug">{s.cue}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2.5 rounded-[14px] bg-white/[0.05] p-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] tnum">
          {((step + 1) % COOK_STEPS.length) + 1}
        </span>
        <span className="min-w-0">
          <span className="block text-[8px] text-white/60">Up next</span>
          <span className="block truncate text-[10px]">
            {COOK_STEPS[(step + 1) % COOK_STEPS.length].title}
          </span>
        </span>
      </div>
      <div className="rounded-[18px] bg-white/10 p-3">
        {s.timer ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] text-white/60">Timer</p>
              <p className="font-mono text-[22px] leading-none tnum">{fmt(left)}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white">
              <Pause size={14} strokeWidth={2.25} />
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/70">No timer on this step</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <Play size={13} />
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 text-[9px]">
          <Volume2 size={11} /> Read aloud
        </span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 text-[9px]">
          <Mic size={11} /> “Next”
        </span>
      </div>
    </div>
  );
}

export function DoneScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-6 text-center">
      <span className="screen-in flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white">
        <CheckCircle2 size={28} strokeWidth={2} />
      </span>
      <p
        className="screen-in text-[18px] tracking-tight"
        style={{ "--d": "120ms" } as React.CSSProperties}
      >
        Jollof, done.
      </p>
      <p
        className="screen-in text-[10px] text-ink-500"
        style={{ "--d": "200ms" } as React.CSSProperties}
      >
        9 steps · 6 servings · 1 hr 19 min
      </p>
      <div
        className="screen-in mt-2 w-full rounded-[18px] bg-surface-100 p-1.5 text-left"
        style={{ "--d": "300ms" } as React.CSSProperties}
      >
        {[
          ["Added to cooking history", Clock],
          ["Saved for next time", Heart],
        ].map(([t, I]) => {
          const Icon = I as typeof Clock;
          return (
            <div
              key={t as string}
              className="flex items-center gap-2 rounded-[13px] px-2 py-2 text-[10px]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                <Icon size={12} />
              </span>
              {t as string}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function JourneyScreen({ step }: { step: JourneyKey }) {
  switch (step) {
    case "discover":
      return <DiscoverScreen />;
    case "check":
      return <CheckScreen />;
    case "shop":
      return <ShopScreen />;
    case "cook":
      return <CookScreen autoplay />;
    case "done":
      return <DoneScreen />;
  }
}
