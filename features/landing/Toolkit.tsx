"use client";

import {
  ArrowRight,
  ListChecks,
  Mic,
  PauseCircle,
  Repeat,
  Sun,
  Timer,
  UserRound,
  Users,
  Volume2,
  WifiOff,
} from "lucide-react";
import { AppLink as Link } from "./launch";
import type { CSSProperties } from "react";
import { Reveal } from "./motion";
import { Band, Eyebrow, SectionHead } from "./ui";

const INK = "var(--color-ink-900)";
const PEPPER = "var(--color-primary-500)";

/** Servings: lines radiate from the pot and breathe in and out. */
function BurstArt() {
  const lines = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r2 = 44 + ((i * 7) % 5) * 7;
    return {
      x1: 100 + Math.cos(a) * 18,
      y1: 90 + Math.sin(a) * 18,
      x2: 100 + Math.cos(a) * r2,
      y2: 90 + Math.sin(a) * r2,
      hot: i % 7 === 0,
      d: `${(i % 7) * 0.12}s`,
    };
  });
  return (
    <svg viewBox="0 0 200 180" className="burst h-full w-full" aria-hidden>
      {lines.map(({ hot, d, ...xy }, i) => (
        <line
          key={i}
          {...xy}
          stroke={hot ? PEPPER : INK}
          strokeWidth={hot ? 1.75 : 1.1}
          strokeLinecap="round"
          style={{ "--d": d } as CSSProperties}
        />
      ))}
      <circle cx="100" cy="90" r="5" fill={PEPPER} />
    </svg>
  );
}

/** Swaps: two ingredients trading places on a slow orbit. */
function SwapArt() {
  return (
    <svg viewBox="0 0 200 180" className="h-full w-full" aria-hidden fill="none">
      <g className="orbit">
        <path d="M70 58a44 44 0 0 1 60 0" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M124 52l6 6-8 2" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M130 122a44 44 0 0 1-60 0" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M76 128l-6-6 8-2" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <circle cx="66" cy="90" r="20" stroke={INK} strokeWidth="1.2" />
      <path d="M58 96c4-12 12-16 18-16-2 8-8 14-18 16zM58 96l10-9" stroke={INK} strokeWidth="1.2" />
      <circle cx="134" cy="90" r="20" stroke={PEPPER} strokeWidth="1.6" />
      <path
        d="M126 97c3-10 10-15 17-15-1 9-8 14-17 15zM126 97l9-8"
        stroke={PEPPER}
        strokeWidth="1.6"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={86 + i * 7} cy="90" r="0.9" fill={INK} />
      ))}
    </svg>
  );
}

/** One list: rows tick off in turn. */
function ListArt() {
  const rows = [52, 82, 112, 142];
  return (
    <svg viewBox="0 0 200 180" className="h-full w-full" aria-hidden fill="none">
      {rows.map((y, i) => (
        <g key={y}>
          <rect x="44" y={y - 9} width="18" height="18" rx="5" stroke={INK} strokeWidth="1.2" />
          {i < 3 && (
            <path
              className="tick"
              pathLength={1}
              d={`M48.5 ${y}l3.5 3.5 6-7`}
              stroke={PEPPER}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ "--d": `${i * 0.45}s` } as CSSProperties}
            />
          )}
          <line
            x1="74"
            y1={y}
            x2={[150, 128, 140, 116][i]}
            y2={y}
            stroke={INK}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeDasharray={i === 3 ? "2 4" : undefined}
          />
          <line
            x1={[158, 136, 148, 124][i]}
            y1={y}
            x2="160"
            y2={y}
            stroke={INK}
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

const TOOLS = [
  {
    art: <BurstArt />,
    title: "Scale it",
    text: "Cooking for two or twelve, every quantity rescales and rounds the way a cook would. Timers stay put.",
    href: "/recipes",
    cta: "Pick a recipe",
  },
  {
    art: <SwapArt />,
    title: "Swap it",
    text: "No ugu in the shop? Each recipe lists its own approved swaps. Fork never invents one.",
    href: "/recipes/egusi-soup",
    cta: "See egusi’s swaps",
  },
  {
    art: <ListArt />,
    title: "List it",
    text: "Whatever’s missing lands on one list, labelled with the recipe and servings it came from.",
    href: "/lists",
    cta: "Open your list",
  },
];

/** Three moves after Kitchen Check, each with a small line drawing. */
export function Toolkit() {
  return (
    <Band rule={false} label="Scale, swap and list" innerClassName="pb-20 sm:pb-28 lg:pb-36">
      <ul className="grid gap-10 md:grid-cols-3 md:gap-4">
        {TOOLS.map((t, i) => (
          <Reveal as="li" key={t.title} delay={i * 90} className="flex flex-col">
            <div className="frame">
              <div className="panel flex h-[220px] items-center justify-center p-4">{t.art}</div>
            </div>
            <h3 className="mt-6 px-1 text-[1.25rem] tracking-[-0.015em]">{t.title}</h3>
            <p className="mt-2 max-w-[340px] px-1 text-[0.9375rem] leading-[1.6] text-ink-500">
              {t.text}
            </p>
            <Link
              href={t.href}
              className="group mt-4 inline-flex min-h-[44px] items-center gap-1.5 self-start px-1 text-[0.9375rem] text-ink-900"
            >
              {t.cta}
              <ArrowRight
                aria-hidden
                size={15}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        ))}
      </ul>
    </Band>
  );
}

const TILES = [
  { icon: Volume2, label: "Read-aloud", text: "Every step, read out" },
  { icon: Mic, label: "Voice commands", text: "Next, back, repeat" },
  { icon: Sun, label: "Screen stays on", text: "No greasy unlocks" },
  { icon: Timer, label: "Timers that hold", text: "Through reloads" },
  { icon: PauseCircle, label: "Pause and resume", text: "Hours later, same step" },
  { icon: WifiOff, label: "Works offline", text: "Even in the market" },
  { icon: Users, label: "Any serving size", text: "1 to 12, rescaled" },
  { icon: Repeat, label: "Approved swaps", text: "Never a guess" },
  { icon: ListChecks, label: "One list", text: "For every pot" },
  { icon: UserRound, label: "No sign-up", text: "Open it and cook" },
];

/** Everything in the app at a glance: a ruled grid of numbered tiles. */
export function FeatureGrid() {
  return (
    <Band labelledBy="kit-title" innerClassName="py-20 sm:py-28 lg:py-36">
      <Reveal>
        <SectionHead
          id="kit-title"
          align="left"
          eyebrow={<Eyebrow tone="ink">In the kitchen</Eyebrow>}
          title="Everything a cook needs."
          tail="Nothing they don’t."
        />
      </Reveal>
      <Reveal delay={120} className="mt-14 lg:mt-16">
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-line-default shadow-[0_0_0_1px_var(--color-line-default)] lg:grid-cols-5">
          {TILES.map((t, i) => (
            <Reveal
              as="li"
              key={t.label}
              delay={i * 60}
              className="group relative flex aspect-square flex-col justify-between bg-surface-50 sm:aspect-[16/10] lg:aspect-square p-4 transition-colors duration-300 hover:bg-white active:bg-white sm:p-5"
            >
              <span className="font-mono text-[0.6875rem] text-ink-500 tnum">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex flex-1 items-center justify-center">
                <t.icon
                  aria-hidden
                  size={34}
                  strokeWidth={1.1}
                  className="text-ink-900 transition-[color,translate,scale] duration-300 ease-out group-hover:-translate-y-1 group-hover:text-primary-600 group-active:scale-90 group-active:text-primary-600"
                />
              </span>
              <span>
                <span className="block text-[0.9375rem] tracking-[-0.01em]">{t.label}</span>
                <span className="mt-0.5 block text-[0.8125rem] text-ink-500">{t.text}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </Reveal>
    </Band>
  );
}
