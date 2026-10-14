"use client";

import { ArrowRight, Check, Minus, Plus, Repeat, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { clampServings } from "@/shared/domain/scaling";
import { formatQuantity, scaleAmount, type Unit } from "@/shared/domain/units";
import { buttonClasses } from "@/shared/ui/Button";
import { DEMO_RECIPE } from "./content";
import { Reveal } from "./motion";
import { Highlight } from "./Texture";

type State = "have" | "need" | "swap";
type Line = (typeof DEMO_RECIPE.ingredients)[number];

/** Uses the app's real scaling + formatting, so the demo can't drift from the product. */
function quantityFor(line: Line, servings: number): string {
  const { amount } = scaleAmount(
    line.amount,
    DEMO_RECIPE.baseServings,
    servings,
    "linear",
    line.unit as Unit,
  );
  if (line.unit === "piece") return String(amount);
  return formatQuantity(amount, line.unit as Unit);
}

const ROLE_LABEL: Record<Line["role"], string> = {
  required: "Required",
  substitutable: "Has an approved swap",
  optional: "Optional, never blocks",
};

export function KitchenCheckDemo() {
  const [servings, setServings] = useState(6);
  const [state, setState] = useState<Record<string, State>>({
    rice: "have",
    onion: "have",
    tatashe: "have",
  });
  const [added, setAdded] = useState<number | null>(null);

  const lines = DEMO_RECIPE.ingredients;
  const needed = lines.filter((l) => l.role !== "optional");
  const ready = needed.filter((l) => state[l.id] === "have" || state[l.id] === "swap");
  const missing = needed.filter((l) => !state[l.id] || state[l.id] === "need");
  const isReady = missing.length === 0;
  const pct = Math.round((ready.length / needed.length) * 100);

  const toggle = (id: string) => {
    setAdded(null);
    setState((s) => ({ ...s, [id]: s[id] === "have" || s[id] === "swap" ? "need" : "have" }));
  };
  const swap = (id: string) => {
    setAdded(null);
    setState((s) => ({ ...s, [id]: s[id] === "swap" ? "need" : "swap" }));
  };
  const step = (delta: number) => {
    setAdded(null);
    setServings((n) => clampServings(n + delta));
  };

  return (
    <section
      id="try"
      aria-labelledby="try-title"
      className="px-5 py-24 sm:px-6 sm:py-32 lg:px-10 lg:py-40"
    >
      <div className="mx-auto max-w-[1240px]">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <p className="text-[1rem] text-ink-500">{"{Try it. This runs on the real engine}"}</p>
          <h2
            id="try-title"
            className="mt-3 text-[2.25rem] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[3.25rem] lg:text-[4rem]"
          >
            Find out you’re out of crayfish before <Highlight>the gas is on.</Highlight>
          </h2>
          <p className="mx-auto mt-6 max-w-[560px] text-[1.125rem] leading-[1.65] text-ink-600">
            Tap what you have. Change the servings. Whatever’s missing becomes your shopping list.
          </p>
        </Reveal>

        <Reveal
          delay={150}
          className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          {/* Ingredients */}
          <div className="rounded-[32px] border border-line-default bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-4 px-3 pb-5 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.8125rem] text-ink-500">Sample recipe</p>
                <p className="text-[1.375rem] font-bold tracking-[-0.02em]">{DEMO_RECIPE.title}</p>
              </div>
              <div
                role="group"
                aria-label="Servings"
                className="flex items-center gap-3 self-start rounded-full bg-surface-100 p-1.5 sm:self-auto"
              >
                <button
                  type="button"
                  onClick={() => step(-1)}
                  disabled={servings <= 1}
                  aria-label="Fewer servings"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white transition-colors hover:bg-surface-200 disabled:opacity-40"
                >
                  <Minus size={18} aria-hidden />
                </button>
                <span aria-live="polite" className="min-w-[96px] text-center text-[0.9375rem] tnum">
                  {servings} servings
                </span>
                <button
                  type="button"
                  onClick={() => step(1)}
                  disabled={servings >= 12}
                  aria-label="More servings"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-ink-900 transition-colors hover:bg-primary-600 disabled:opacity-40"
                >
                  <Plus size={18} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {lines.map((line) => {
                const s = state[line.id] ?? "need";
                const have = s === "have" || s === "swap";
                const qty = quantityFor(line, servings);
                return (
                  <li
                    key={line.id}
                    className={`flex flex-wrap items-center gap-2 rounded-[22px] p-1.5 transition-colors duration-300 ${
                      have ? "bg-primary-100" : "bg-surface-50"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={have}
                      onClick={() => toggle(line.id)}
                      className="flex min-h-[56px] w-full min-w-0 items-center gap-3 rounded-[18px] px-2.5 text-left sm:w-auto sm:flex-1"
                    >
                      <span
                        aria-hidden
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                          have
                            ? "bg-primary-500 text-ink-900"
                            : "border border-line-strong bg-white text-transparent"
                        }`}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem]">
                          {s === "swap" && "swap" in line ? line.swap : line.name}
                        </span>
                        <span className="block text-[0.8125rem] text-ink-500">
                          {s === "swap"
                            ? `Swapped for ${line.name.toLowerCase()}`
                            : ROLE_LABEL[line.role]}
                        </span>
                      </span>
                      <span key={qty} className="word-in shrink-0 pr-2 text-[0.9375rem] tnum">
                        {qty}
                      </span>
                    </button>
                    {"swap" in line && s !== "have" && (
                      <button
                        type="button"
                        aria-pressed={s === "swap"}
                        onClick={() => swap(line.id)}
                        className={`mb-1 ml-[52px] inline-flex min-h-[44px] items-center sm:mb-0 sm:ml-0 sm:mr-1 gap-1.5 rounded-full px-4 text-[0.8125rem] transition-colors ${
                          s === "swap"
                            ? "bg-white text-ink-900"
                            : "border border-line-default bg-white text-ink-700 hover:border-line-strong"
                        }`}
                      >
                        <Repeat size={14} aria-hidden />
                        {s === "swap" ? "Undo swap" : `Have ${line.swap.toLowerCase()}?`}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Readiness */}
          <div className="flex flex-col rounded-[32px] border border-line-default bg-white p-6 sm:p-8 lg:sticky lg:top-28 lg:self-start">
            <p className="text-[0.875rem] text-ink-500">Readiness</p>
            <p className="mt-2 text-[4rem] font-extrabold leading-none tracking-[-0.05em] tnum">
              {ready.length}
              <span className="text-ink-400">/{needed.length}</span>
            </p>
            <div
              className="mt-5 h-2 overflow-hidden rounded-full bg-surface-200"
              role="progressbar"
              aria-label="Ingredients ready"
              aria-valuemin={0}
              aria-valuemax={needed.length}
              aria-valuenow={ready.length}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${isReady ? "bg-primary-500" : "bg-ink-900"}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div aria-live="polite" className="mt-6 flex-1">
              {isReady ? (
                <div className="screen-in">
                  <p className="text-[1.125rem] font-medium">Ready to cook.</p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-500">
                    Everything required is in your kitchen. Bay leaves are optional, so they never
                    hold you up.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[1.125rem] font-medium">
                    {missing.length} to buy for {servings} servings
                  </p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {missing.map((m) => (
                      <li
                        key={m.id}
                        className="screen-in flex items-center justify-between rounded-[16px] bg-surface-50 px-4 py-3 text-[0.9375rem]"
                      >
                        <span>{m.name}</span>
                        <span className="text-ink-500 tnum">{quantityFor(m, servings)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6">
              {isReady ? (
                <Link href="/" className={buttonClasses({ size: "lg", className: "group w-full" })}>
                  Start cooking
                  <ArrowRight
                    size={18}
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdded(missing.length)}
                  className={buttonClasses({ variant: "dark", size: "lg", className: "w-full" })}
                >
                  <ShoppingBasket size={18} aria-hidden />
                  Add {missing.length} to shopping list
                </button>
              )}
              <p
                aria-live="polite"
                className="mt-3 min-h-[20px] text-center text-[0.8125rem] text-ink-500"
              >
                {added !== null
                  ? `Done. In the app, ${added} item${added === 1 ? "" : "s"} would be on your list, labelled “for ${servings} servings”.`
                  : "Demo only. Nothing here is saved."}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
