"use client";

import { ArrowRight, Check, Minus, Plus, Repeat, ShoppingBasket } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { clampServings } from "@/shared/domain/scaling";
import { formatQuantity, scaleAmount, type Unit } from "@/shared/domain/units";
import { DEMO_RECIPE } from "./content";
import { Reveal } from "./motion";
import { photoUrl } from "./Texture";
import { Band, ChapterHead, GrainStage, Index } from "./ui";

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
    <Band id="try" labelledBy="try-title" innerClassName="py-20 sm:py-28 lg:py-36">
      <Reveal>
        <ChapterHead
          id="try-title"
          num="01"
          label="Check"
          title="Find out you’re out of crayfish"
          tail="before the gas is on."
          lead="Tap what you have and change the servings. This demo runs on the same scaling engine as the app, so every quantity is the real one. Whatever’s missing becomes your shopping list."
        />
      </Reveal>

      <Reveal delay={150} className="mt-14 lg:mt-20">
        <GrainStage src={photoUrl("market", 1800)} className="p-3 sm:p-8 lg:p-14">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* Ingredients */}
            <div className="glass">
              <div className="panel p-2 sm:p-3">
                <div className="flex flex-col gap-4 px-3 pb-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col items-start gap-1.5">
                    <Index>Sample recipe</Index>
                    <p className="text-[1.375rem] tracking-[-0.02em]">{DEMO_RECIPE.title}</p>
                  </div>
                  <div
                    role="group"
                    aria-label="Servings"
                    className="flex items-center gap-2 self-start rounded-full bg-surface-100 p-1 sm:self-auto"
                  >
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      disabled={servings <= 1}
                      aria-label="Fewer servings"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_var(--hair)] transition-[background-color,scale] duration-150 ease-out hover:bg-surface-50 active:scale-[0.97] disabled:opacity-40"
                    >
                      <Minus size={17} aria-hidden />
                    </button>
                    <span
                      aria-live="polite"
                      className="min-w-[96px] text-center font-mono text-[0.8125rem] tnum"
                    >
                      {servings} servings
                    </span>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      disabled={servings >= 12}
                      aria-label="More servings"
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white transition-[background-color,scale] duration-150 ease-out hover:bg-primary-700 active:scale-[0.97] disabled:opacity-40"
                    >
                      <Plus size={17} strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                </div>

                <ul className="flex flex-col gap-1">
                  {lines.map((line) => {
                    const s = state[line.id] ?? "need";
                    const have = s === "have" || s === "swap";
                    const qty = quantityFor(line, servings);
                    return (
                      <li
                        key={line.id}
                        className={`flex flex-wrap items-center gap-2 rounded-[14px] p-1 transition-colors duration-300 ${
                          have ? "bg-primary-50" : "bg-surface-50 hover:bg-surface-100"
                        }`}
                      >
                        <button
                          type="button"
                          aria-pressed={have}
                          onClick={() => toggle(line.id)}
                          className="flex min-h-[56px] w-full min-w-0 items-center gap-3 rounded-[12px] px-2.5 text-left transition-[scale] duration-150 ease-out active:scale-[0.99] sm:w-auto sm:flex-1"
                        >
                          <span
                            aria-hidden
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                              have
                                ? "bg-primary-600 text-white"
                                : "bg-white text-transparent shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
                            }`}
                          >
                            <Check size={14} strokeWidth={2.75} />
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
                          <span
                            key={qty}
                            className="word-in shrink-0 pr-2 font-mono text-[0.8125rem] text-ink-700 tnum"
                          >
                            {qty}
                          </span>
                        </button>
                        {"swap" in line && s !== "have" && (
                          <button
                            type="button"
                            aria-pressed={s === "swap"}
                            onClick={() => swap(line.id)}
                            className="mb-1 ml-[48px] inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white px-3.5 text-[0.8125rem] text-ink-700 shadow-[0_0_0_1px_var(--hair)] transition-[color,scale] duration-150 ease-out hover:text-ink-900 active:scale-[0.97] sm:mb-0 sm:ml-0 sm:mr-1"
                          >
                            <Repeat size={13} aria-hidden />
                            {s === "swap" ? "Undo swap" : `Have ${line.swap.toLowerCase()}?`}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Readiness */}
            <div className="glass lg:self-start">
              <div className="panel flex flex-col p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <p className="text-[0.9375rem]">Readiness</p>
                  <Index>{pct}%</Index>
                </div>
                <p className="mt-4 text-[4rem] font-light leading-none tracking-[-0.05em] tnum">
                  {ready.length}
                  <span className="text-ink-500">/{needed.length}</span>
                </p>
                <div
                  className="mt-5 flex gap-1"
                  role="progressbar"
                  aria-label="Ingredients ready"
                  aria-valuemin={0}
                  aria-valuemax={needed.length}
                  aria-valuenow={ready.length}
                >
                  {needed.map((n, i) => (
                    <span
                      key={n.id}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                        i < ready.length ? "bg-primary-500" : "bg-surface-200"
                      }`}
                    />
                  ))}
                </div>

                <div aria-live="polite" className="mt-6 flex-1">
                  {isReady ? (
                    <div className="screen-in">
                      <p className="text-[1.125rem]">Ready to cook.</p>
                      <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-500">
                        Everything required is in your kitchen. Bay leaves are optional, so they
                        never hold you up.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[1.0625rem]">
                        {missing.length} to buy for {servings} servings
                      </p>
                      <ul className="mt-3 flex flex-col">
                        {missing.map((m) => (
                          <li
                            key={m.id}
                            className="screen-in flex items-center justify-between border-t border-dashed border-line-strong py-2.5 text-[0.9375rem]"
                          >
                            <span>{m.name}</span>
                            <span className="font-mono text-[0.8125rem] text-ink-500 tnum">
                              {quantityFor(m, servings)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  {isReady ? (
                    <Link
                      href="/app"
                      className="group flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary-600 text-[0.9375rem] font-medium text-white transition-[background-color,scale] duration-150 ease-out hover:bg-primary-700 active:scale-[0.97]"
                    >
                      Start cooking
                      <ArrowRight
                        size={17}
                        aria-hidden
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdded(missing.length)}
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-ink-900 text-[0.9375rem] font-medium text-white transition-[background-color,scale] duration-150 ease-out hover:bg-ink-800 active:scale-[0.97]"
                    >
                      <ShoppingBasket size={17} aria-hidden />
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
            </div>
          </div>
        </GrainStage>
      </Reveal>
    </Band>
  );
}
