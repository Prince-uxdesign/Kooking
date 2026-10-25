"use client";

import {
  ArrowRight,
  ChefHat,
  Check,
  Clock,
  Flame,
  Info,
  Play,
  Sparkles,
  Timer as TimerIcon,
  Utensils,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { usePwa } from "@/features/pwa";
import { stepCues } from "@/shared/domain/cues";
import { difficultyLabel, formatMinutes } from "@/shared/domain/discovery";
import {
  deriveEquipment,
  derivePreparation,
  deriveTips,
  groupPreparationItems,
  type EquipmentItem,
} from "@/shared/domain/recipe-detail";
import type { Recipe, RecipeIngredient } from "@/shared/domain/recipe-schema";
import { kitchenCheckHref } from "@/shared/domain/navigation";
import { startCookingIfReady } from "./start-cooking";
import { calculateScalingRatio, scaleRecipe, type ScaledLine } from "@/shared/domain/scaling";
import { Button, buttonClasses } from "@/shared/ui/Button";
import { QuantityInput } from "@/shared/ui/QuantityInput";
import { StepPhoto } from "@/shared/ui/StepPhoto";

const ROLE_LABELS: Record<RecipeIngredient["role"], string> = {
  required: "Required",
  optional: "Optional",
  substitutable: "Swappable",
  garnish: "Garnish",
};

const HEAT_LABELS: Record<string, string> = {
  low: "Low heat",
  "medium-low": "Medium-low heat",
  medium: "Medium heat",
  "medium-high": "Medium-high heat",
  high: "High heat",
};

export interface RecipeDetailInteractiveProps {
  recipe: Recipe;
  ingredientNames: Record<string, string>;
  /** Unused since saving moved onto the photo; kept for callers. */
  initialSaved?: boolean;
  /** Serving count carried in from Kitchen Check (`?servings=`). */
  initialServings?: number;
  /** Discovery origin, forwarded so back links keep working. */
  from?: string | null;
}

export function RecipeDetailInteractive({
  recipe,
  ingredientNames,
  initialServings,
  from = null,
}: RecipeDetailInteractiveProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [servings, setServings] = useState(initialServings ?? recipe.baseServings);
  const [haveItems, setHaveItems] = useState<Record<string, boolean>>({});
  const [preparedItems, setPreparedItems] = useState<Record<string, boolean>>({});

  const nameMap = useMemo(() => new Map(Object.entries(ingredientNames)), [ingredientNames]);
  const scaledIngredients = useMemo(() => scaleRecipe(recipe, servings), [recipe, servings]);
  const equipment = useMemo(() => deriveEquipment(recipe), [recipe]);
  const preparation = useMemo(
    () => derivePreparation(recipe, nameMap, scaledIngredients),
    [recipe, nameMap, scaledIngredients],
  );
  const prepGroups = useMemo(() => groupPreparationItems(preparation), [preparation]);
  const tips = useMemo(() => deriveTips(recipe, nameMap), [recipe, nameMap]);

  const totalPrepCount = preparation.length;
  const preparedCount = preparation.filter((p) => !!preparedItems[p.id]).length;
  const allPrepared = totalPrepCount > 0 && preparedCount === totalPrepCount;

  const togglePrepared = (prepId: string) => {
    setPreparedItems((prev) => ({ ...prev, [prepId]: !prev[prepId] }));
  };

  const markAllPrepared = () => {
    const next: Record<string, boolean> = {};
    preparation.forEach((p) => {
      next[p.id] = true;
    });
    setPreparedItems(next);
  };

  const resetPrepared = () => {
    setPreparedItems({});
  };

  const totalTimeLabel = formatMinutes(recipe.timeMinutes.total);
  const prepTimeLabel = formatMinutes(recipe.timeMinutes.prep);
  const cookTimeLabel = formatMinutes(recipe.timeMinutes.cook);
  const diffLabel = difficultyLabel(recipe.difficulty);

  const toggleHave = (lineId: string) => {
    setHaveItems((prev) => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  const handleStartCooking = async () => {
    // Cooking only starts when the Kitchen Check says so; otherwise go finish it.
    const result = await startCookingIfReady({ recipe, servings, ingredientNames });
    startTransition(() => {
      router.push(result.ok ? result.href : kitchenCheckHref(recipe.slug, { servings, from }));
    });
  };

  const checkHref = kitchenCheckHref(recipe.slug, { servings, from });

  const requiredCount = recipe.ingredients.filter(
    (i) => i.role === "required" || i.role === "substitutable",
  ).length;
  const haveRequiredCount = recipe.ingredients.filter(
    (i) => (i.role === "required" || i.role === "substitutable") && haveItems[i.id],
  ).length;
  const pwa = usePwa();
  const isOffline = !pwa.isOnline || !pwa.isServerReachable;

  const maxServings = Math.max(12, Math.min(24, recipe.baseServings * 2));
  const presets = Array.from(new Set([2, 4, 6, 8, 10, 12, recipe.baseServings]))
    .filter((n) => n <= maxServings)
    .sort((x, y) => x - y);

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-10">
        {isOffline && (
          <div
            role="status"
            className="card-edge flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-sm text-ink-700"
          >
            <WifiOff size={16} className="shrink-0 text-warning-700" aria-hidden />
            <span>
              <strong>Viewing cached recipe offline.</strong> All ingredient scaling, sensory cues,
              and cooking steps are ready on this device.
            </span>
          </div>
        )}

        {/* Servings: pick a common size, or set an exact number. */}
        <section aria-labelledby="section-overview" className="flex flex-col gap-3">
          <SectionTitle id="section-overview" title="Servings">
            Quantities scale with you. Timers and heat stay the same.
          </SectionTitle>

          <div className="card-edge flex flex-col gap-4 rounded-3xl bg-white p-2 pb-4">
            <div
              role="radiogroup"
              aria-label="Choose servings"
              className="no-scrollbar flex gap-1 overflow-x-auto rounded-[20px] bg-surface-100 p-1"
            >
              {presets.map((n) => {
                const on = n === servings;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setServings(n)}
                    className={`tnum min-h-[44px] min-w-[52px] flex-1 rounded-[16px] px-3 text-[0.9375rem] font-medium transition-[color,background-color,box-shadow,scale] duration-200 ease-out active:scale-95 ${
                      on
                        ? "bg-white text-ink-900 shadow-[0_1px_3px_rgb(21_18_15/0.12),0_0_0_1px_var(--color-line-default)]"
                        : "text-ink-500 hover:text-ink-900"
                    }`}
                  >
                    {n}
                    {n === recipe.baseServings && <span className="sr-only"> (base recipe)</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-3">
              <p className="text-[0.875rem] leading-5 text-ink-500">
                {servings === recipe.baseServings ? (
                  <>
                    Base recipe · serves{" "}
                    <strong className="font-semibold text-ink-900">{recipe.baseServings}</strong>
                  </>
                ) : (
                  <>
                    Scaled{" "}
                    <strong className="tnum font-semibold text-ink-900">
                      {calculateScalingRatio(recipe.baseServings, servings)}×
                    </strong>{" "}
                    from {recipe.baseServings} ·{" "}
                    <button
                      type="button"
                      onClick={() => setServings(recipe.baseServings)}
                      className="rounded font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
                    >
                      Reset to base ({recipe.baseServings})
                    </button>
                  </>
                )}
              </p>
              <QuantityInput
                label="Target servings"
                value={servings}
                min={1}
                max={maxServings}
                onChange={setServings}
              />
            </div>
          </div>
        </section>

        {/* Ingredients */}
        <section aria-labelledby="section-ingredients" className="flex flex-col gap-3">
          <SectionTitle
            id="section-ingredients"
            title="Ingredients"
            action={
              <Link
                href={checkHref}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[0.875rem] font-medium text-primary-700 transition-colors hover:bg-primary-50"
              >
                Kitchen check
                <ArrowRight aria-hidden size={15} />
              </Link>
            }
          >
            <span className="tnum">
              {scaledIngredients.length} items for {servings} · tap what you have
            </span>
          </SectionTitle>

          <ul className="card-edge flex flex-col rounded-3xl bg-white p-1.5">
            {scaledIngredients.map((line: ScaledLine, idx) => {
              const displayName = nameMap.get(line.ingredientId) ?? line.ingredientId;
              const isChecked = !!haveItems[line.id];
              const isSubstitutable = line.role === "substitutable";
              const subsText =
                isSubstitutable && line.substitutes && line.substitutes.length > 0
                  ? line.substitutes.map((s) => nameMap.get(s) ?? s).join(", ")
                  : null;
              const details = [
                line.preparation,
                line.constraint && `Note: ${line.constraint}`,
                line.note,
                subsText && `Swap for ${subsText}`,
              ].filter(Boolean);

              return (
                <li key={line.id} className="list-none">
                  {idx > 0 && <div aria-hidden className="mx-4 h-px bg-line-default" />}
                  <label className="group flex min-h-[60px] cursor-pointer items-center gap-3.5 rounded-[20px] px-3 py-3 transition-colors hover:bg-surface-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleHave(line.id)}
                      aria-label={`${displayName}, ${line.displayQuantity}`}
                      className="peer sr-only"
                    />
                    <CheckDot on={isChecked} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span
                        className={`text-[0.9375rem] font-medium leading-5 break-words transition-colors ${
                          isChecked
                            ? "text-ink-500 line-through decoration-ink-300"
                            : "text-ink-900"
                        }`}
                      >
                        {displayName}
                        {line.role !== "required" && (
                          <span className="ml-2 inline-flex translate-y-[-1px] rounded-full bg-info-100 px-2 py-0.5 align-middle text-[0.6875rem] font-medium text-info-700 no-underline">
                            {ROLE_LABELS[line.role]}
                          </span>
                        )}
                      </span>
                      {details.length > 0 && (
                        <span className="text-[0.8125rem] leading-5 text-ink-500">
                          {details.join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="tnum text-[0.9375rem] font-semibold text-ink-900">
                        {line.displayQuantity}
                      </span>
                      {line.approximate && (
                        <span className="text-[0.6875rem] text-ink-500">approx</span>
                      )}
                      {line.requiresManual && (
                        <span className="rounded bg-warning-100 px-1.5 py-0.5 text-[0.6875rem] font-medium text-warning-700">
                          Manual adjustment
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Preparation (mise en place) */}
        {preparation.length > 0 && (
          <section aria-labelledby="section-preparation" className="flex flex-col gap-3">
            <SectionTitle
              id="section-preparation"
              title="Before you start"
              action={
                <button
                  type="button"
                  onClick={allPrepared ? resetPrepared : markAllPrepared}
                  className="inline-flex min-h-[40px] items-center rounded-full px-3 text-[0.875rem] font-medium text-primary-700 transition-colors hover:bg-primary-50"
                >
                  {allPrepared ? "Reset checklist" : "Mark all ready"}
                </button>
              }
            >
              <span className="tnum">
                {preparedCount} of {totalPrepCount} ready · prep, wash and measure first
              </span>
            </SectionTitle>

            <div className="card-edge flex flex-col gap-1 rounded-3xl bg-white p-1.5">
              {prepGroups.map((group, gi) => {
                const groupPreparedCount = group.items.filter(
                  (item) => !!preparedItems[item.id],
                ).length;
                const isGroupAllDone = groupPreparedCount === group.items.length;
                return (
                  <div key={group.category} className="flex flex-col">
                    {gi > 0 && <div aria-hidden className="mx-4 my-1 h-px bg-line-default" />}
                    <div className="flex items-center justify-between px-3 pb-1 pt-3">
                      <h3 className="font-label text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-ink-500">
                        {group.label}{" "}
                        <span className="tnum">
                          · {groupPreparedCount}/{group.items.length}
                        </span>
                      </h3>
                      {isGroupAllDone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-success-700">
                          <Check aria-hidden size={11} strokeWidth={3} />
                          Group done
                        </span>
                      )}
                    </div>
                    <ul className="flex flex-col">
                      {group.items.map((prep) => {
                        const isDone = !!preparedItems[prep.id];
                        const labelText = prep.ingredientName
                          ? `${prep.ingredientName}, ${prep.preparationState ?? "prepared"}`
                          : prep.instruction;
                        return (
                          <li key={prep.id} className="list-none">
                            <label className="flex min-h-[56px] cursor-pointer items-center gap-3.5 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-surface-50">
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => togglePrepared(prep.id)}
                                aria-label={`Mark as prepared: ${labelText}`}
                                className="peer sr-only"
                              />
                              <CheckDot on={isDone} />
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span
                                  className={`text-[0.9375rem] font-medium leading-5 break-words ${
                                    isDone
                                      ? "text-ink-500 line-through decoration-ink-300"
                                      : "text-ink-900"
                                  }`}
                                >
                                  {prep.ingredientName ?? prep.instruction}
                                  {prep.preparationState && prep.ingredientName && (
                                    <span className="font-normal text-ink-500">
                                      , {prep.preparationState}
                                    </span>
                                  )}
                                </span>
                                {(prep.detail || prep.stepTimingAdvice) && (
                                  <span className="text-[0.8125rem] leading-5 text-ink-500">
                                    {[prep.detail, prep.stepTimingAdvice]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                )}
                              </span>
                              {prep.displayQuantity && (
                                <span className="tnum shrink-0 text-[0.875rem] font-semibold text-ink-900">
                                  {prep.displayQuantity}
                                </span>
                              )}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Equipment */}
        {equipment.length > 0 && (
          <section aria-labelledby="section-equipment" className="flex flex-col gap-3">
            <SectionTitle id="section-equipment" title="Equipment" />
            <ul className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
              {equipment.map((eq: EquipmentItem) => (
                <li
                  key={eq.id}
                  className="card-edge flex w-[220px] shrink-0 items-start gap-3 rounded-[20px] bg-white p-3.5 sm:w-auto"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    {eq.iconType === "flame" && <Flame size={18} strokeWidth={1.75} />}
                    {eq.iconType === "timer" && <TimerIcon size={18} strokeWidth={1.75} />}
                    {eq.iconType === "knife" && <Utensils size={18} strokeWidth={1.75} />}
                    {eq.iconType === "colander" && <ChefHat size={18} strokeWidth={1.75} />}
                    {eq.iconType !== "flame" &&
                      eq.iconType !== "timer" &&
                      eq.iconType !== "knife" &&
                      eq.iconType !== "colander" && <Utensils size={18} strokeWidth={1.75} />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[0.9375rem] font-medium text-ink-900">{eq.name}</span>
                    <span className="text-[0.8125rem] leading-4 text-ink-500">{eq.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Steps: a numbered timeline */}
        <section aria-labelledby="section-instructions" className="flex flex-col gap-3">
          <SectionTitle id="section-instructions" title="Cooking instructions">
            {recipe.steps.length} steps · Cooking Mode walks you through each one
          </SectionTitle>

          <ol className="flex flex-col">
            {recipe.steps.map((step, idx) => {
              const usedIngredients = step.ingredientIds
                .map((id) => {
                  const line = recipe.ingredients.find((i) => i.id === id);
                  return line ? (nameMap.get(line.ingredientId) ?? line.ingredientId) : null;
                })
                .filter(Boolean);
              const last = idx === recipe.steps.length - 1;
              const meta = [
                step.heat && {
                  icon: <Flame aria-hidden size={13} strokeWidth={1.75} />,
                  text: HEAT_LABELS[step.heat] ?? step.heat,
                },
                step.timer && {
                  icon: <TimerIcon aria-hidden size={13} strokeWidth={1.75} />,
                  text: formatMinutes(Math.round(step.timer.durationSeconds / 60)),
                },
                step.estimatedMinutes &&
                  !step.timer && {
                    icon: <Clock aria-hidden size={13} strokeWidth={1.75} />,
                    text: formatMinutes(step.estimatedMinutes),
                  },
              ].filter(Boolean) as Array<{ icon: React.ReactNode; text: string }>;

              return (
                <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="tnum inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[0.875rem] font-semibold text-primary-700 ring-4 ring-surface-50">
                      {step.order}
                    </span>
                    {!last && <span aria-hidden className="mt-1 w-px flex-1 bg-line-strong" />}
                  </div>

                  <div className="card-edge flex min-w-0 flex-1 flex-col gap-3 rounded-3xl bg-white p-4 sm:p-5">
                    {meta.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {meta.map((m) => (
                          <span
                            key={m.text}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-[0.75rem] font-medium text-ink-700"
                          >
                            {m.icon}
                            {m.text}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[1rem] leading-[1.6] text-ink-900">{step.instruction}</p>

                    {step.image && (
                      <StepPhoto
                        image={step.image}
                        className="aspect-[16/10] max-w-md rounded-2xl bg-surface-200"
                      />
                    )}

                    {stepCues(step).length > 0 && (
                      <div className="flex items-start gap-2.5 rounded-2xl bg-primary-50/70 p-3.5 text-[0.875rem] leading-5 text-ink-700">
                        <Sparkles
                          aria-hidden
                          size={16}
                          className="mt-0.5 shrink-0 text-primary-700"
                        />
                        <ul className="flex flex-col gap-1">
                          {stepCues(step).map((cue) => (
                            <li key={cue.kind}>
                              <span className="font-semibold text-ink-900">{cue.label}: </span>
                              {cue.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {step.completionNote && (
                      <p className="flex items-start gap-2 text-[0.8125rem] leading-5 text-ink-600">
                        <Info aria-hidden size={15} className="mt-0.5 shrink-0 text-ink-500" />
                        <span>
                          <strong className="font-semibold text-ink-800">Done sign: </strong>
                          {step.completionNote}
                        </span>
                      </p>
                    )}

                    {usedIngredients.length > 0 && (
                      <p className="text-[0.8125rem] leading-5 text-ink-500">
                        <span className="font-medium text-ink-700">Uses </span>
                        {usedIngredients.join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Notes & tips */}
        {tips.length > 0 && (
          <section aria-labelledby="section-tips" className="flex flex-col gap-3">
            <SectionTitle id="section-tips" title="Notes and tips" />
            <div className="grid gap-3 sm:grid-cols-2">
              {tips.map((tip, idx) => (
                <div key={idx} className="card-edge rounded-3xl bg-white p-4">
                  <h3 className="text-[0.9375rem] font-semibold text-ink-900">{tip.title}</h3>
                  <p className="mt-1 text-[0.875rem] leading-5 text-ink-600">{tip.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Desktop: sticky summary and actions */}
      <aside aria-label="Cooking preparation" className="hidden lg:sticky lg:top-8 lg:block">
        <div className="card-edge flex flex-col gap-5 rounded-[32px] bg-white p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-headline text-[1.375rem] font-medium tracking-[-0.02em] text-ink-900">
              Ready to cook?
            </h3>
            <p className="text-[0.8125rem] leading-5 text-ink-500">
              Check your kitchen first, or go straight into Cooking Mode.
            </p>
          </div>

          <dl className="flex flex-col divide-y divide-line-default rounded-2xl bg-surface-50 px-4 text-[0.875rem]">
            <SummaryRow label="Total time" value={totalTimeLabel ?? "—"} />
            {prepTimeLabel && cookTimeLabel && (
              <SummaryRow
                label="Active time"
                value={`${prepTimeLabel} prep · ${cookTimeLabel} cook`}
              />
            )}
            <SummaryRow label="Servings" value={String(servings)} />
            {diffLabel && <SummaryRow label="Difficulty" value={diffLabel} />}
            <SummaryRow
              label="Required items"
              value={`${haveRequiredCount} / ${requiredCount} checked`}
            />
            {preparation.length > 0 && (
              <SummaryRow label="Prep" value={`${preparedCount} / ${preparation.length} ready`} />
            )}
          </dl>

          <div className="flex flex-col gap-2.5">
            <Button variant="primary" size="lg" onClick={handleStartCooking} className="w-full">
              <Play aria-hidden size={18} fill="currentColor" />
              Start cooking
            </Button>
            <Link
              href={checkHref}
              className={buttonClasses({ variant: "secondary", size: "md", className: "w-full" })}
            >
              Kitchen check
            </Link>
          </div>
        </div>
      </aside>

      {/* Phones and tablets: actions float just above the tab bar. */}
      <div className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[560px] lg:hidden">
        <div className="glass-bar card-edge flex items-center gap-2 rounded-full p-1.5 pl-5">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="tnum truncate text-[0.75rem] text-ink-500">
              {totalTimeLabel ?? "Cooking mode"}
            </span>
            <span className="tnum text-[0.875rem] font-semibold text-ink-900">
              Serves {servings}
            </span>
          </div>
          <Link
            href={checkHref}
            className="inline-flex min-h-[48px] items-center rounded-full px-4 text-[0.9375rem] font-medium text-ink-900 transition-colors hover:bg-surface-100"
          >
            Check
          </Link>
          <Button variant="primary" size="md" onClick={handleStartCooking} className="px-5">
            <Play aria-hidden size={16} fill="currentColor" />
            Start cooking
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Section heading with a quiet line under it and an optional action on the right. */
function SectionTitle({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          id={id}
          className="font-headline text-[1.375rem] font-medium leading-7 tracking-[-0.02em] text-ink-900"
        >
          {title}
        </h2>
        {children && <p className="text-[0.8125rem] leading-5 text-ink-500">{children}</p>}
      </div>
      {action}
    </div>
  );
}

/** Round check that follows the visually hidden checkbox before it (`peer`). */
function CheckDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,scale] duration-200 ease-out peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-info-700 group-active:scale-90 ${
        on
          ? "bg-primary-600 text-white"
          : "bg-white shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"
      }`}
    >
      {on && <Check size={14} strokeWidth={3} />}
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5">
      <dt className="text-ink-500">{label}</dt>
      <dd className="tnum text-right font-medium text-ink-900">{value}</dd>
    </div>
  );
}
