"use client";

import {
  Bookmark,
  ChefHat,
  Check,
  Clock,
  Flame,
  Info,
  Play,
  Sparkles,
  Timer as TimerIcon,
  Users,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LocalSaved } from "@/shared/data/local";
import { stepCues } from "@/shared/domain/cues";
import { difficultyLabel, formatMinutes } from "@/shared/domain/discovery";
import {
  deriveEquipment,
  derivePreparation,
  deriveTips,
  groupPreparationItems,
  type EquipmentItem,
  type PrepGroup,
  type PrepItem,
} from "@/shared/domain/recipe-detail";
import type { Recipe, RecipeIngredient } from "@/shared/domain/recipe-schema";
import { kitchenCheckHref } from "@/shared/domain/navigation";
import { startCookingIfReady } from "./start-cooking";
import { calculateScalingRatio, scaleRecipe, type ScaledLine } from "@/shared/domain/scaling";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonClasses } from "@/shared/ui/Button";
import { QuantityInput } from "@/shared/ui/QuantityInput";

const localSaved = new LocalSaved();

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
  initialSaved?: boolean;
  /** Serving count carried in from Kitchen Check (`?servings=`). */
  initialServings?: number;
  /** Discovery origin, forwarded so back links keep working. */
  from?: string | null;
}

export function RecipeDetailInteractive({
  recipe,
  ingredientNames,
  initialSaved = false,
  initialServings,
  from = null,
}: RecipeDetailInteractiveProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [servings, setServings] = useState(initialServings ?? recipe.baseServings);
  const [saved, setSaved] = useState(initialSaved);
  const [haveItems, setHaveItems] = useState<Record<string, boolean>>({});
  const [preparedItems, setPreparedItems] = useState<Record<string, boolean>>({});

  const nameMap = new Map(Object.entries(ingredientNames));
  const scaledIngredients = scaleRecipe(recipe, servings);
  const equipment = deriveEquipment(recipe);
  const preparation = derivePreparation(recipe, nameMap, scaledIngredients);
  const prepGroups = groupPreparationItems(preparation);
  const tips = deriveTips(recipe, nameMap);

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

  const handleSaveToggle = async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      if (nextSaved) {
        await localSaved.save({
          ownerId: "guest",
          recipeId: recipe.id,
          savedAt: Date.now(),
        });
      } else {
        await localSaved.unsave("guest", recipe.id);
      }
    } catch {
      // Local storage fallback
    }
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

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12">
      {/* Main Content Column */}
      <div className="flex flex-col gap-10">
        {/* Section 1: Overview & Serving Selector */}
        <section aria-labelledby="section-overview" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="section-overview" className="text-[20px] font-semibold text-ink-900">
              Servings & Scaling
            </h2>
            <button
              type="button"
              onClick={handleSaveToggle}
              aria-label={saved ? `Remove ${recipe.title} from saved` : `Save ${recipe.title}`}
              aria-pressed={saved}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-3 focus-visible:outline-info-700 ${
                saved
                  ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
                  : "bg-surface-100 text-ink-700 hover:bg-surface-200"
              }`}
            >
              <Bookmark
                aria-hidden
                size={15}
                strokeWidth={1.75}
                fill={saved ? "currentColor" : "none"}
              />
              <span>{saved ? "Saved" : "Save recipe"}</span>
            </button>
          </div>

          <div className="rounded-3xl bg-surface-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-medium text-ink-900">Adjust servings</p>
                <p className="text-[13px] text-ink-500">
                  Ingredients scale automatically. Timers and heat stay invariant.
                </p>
              </div>
              <QuantityInput
                label="Target servings"
                value={servings}
                min={1}
                max={Math.max(12, Math.min(24, recipe.baseServings * 2))}
                onChange={setServings}
              />
            </div>
            {servings !== recipe.baseServings && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-default/60 pt-3 text-[12px] text-ink-500">
                <span>
                  Base recipe serves <strong className="text-ink-900">{recipe.baseServings}</strong>
                  . Scaled for <strong className="text-ink-900">{servings}</strong> servings (
                  {calculateScalingRatio(recipe.baseServings, servings)}x).
                </span>
                <button
                  type="button"
                  onClick={() => setServings(recipe.baseServings)}
                  className="font-medium text-primary-700 underline hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                >
                  Reset to base ({recipe.baseServings})
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Ingredients */}
        <section aria-labelledby="section-ingredients" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="section-ingredients" className="text-[20px] font-semibold text-ink-900">
                Ingredients
              </h2>
              <p className="text-[13px] text-ink-500">
                {scaledIngredients.length} ingredients · Tap to mark items you have
              </p>
            </div>
            <Link href={checkHref} className={buttonClasses({ variant: "secondary", size: "md" })}>
              Kitchen check
            </Link>
          </div>

          <ul className="flex flex-col gap-2.5">
            {scaledIngredients.map((line: ScaledLine) => {
              const displayName = nameMap.get(line.ingredientId) ?? line.ingredientId;
              const isChecked = !!haveItems[line.id];
              const isSubstitutable = line.role === "substitutable";
              const subsText =
                isSubstitutable && line.substitutes && line.substitutes.length > 0
                  ? line.substitutes.map((s) => nameMap.get(s) ?? s).join(", ")
                  : null;

              return (
                <li key={line.id} className="list-none">
                  <label
                    className={`flex min-h-[58px] cursor-pointer items-start gap-3 rounded-[20px] p-3.5 transition-colors sm:items-center ${
                      isChecked
                        ? "bg-primary-100/70 text-ink-900"
                        : "bg-surface-100 hover:bg-surface-200/70"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleHave(line.id)}
                      aria-label={`${displayName}, ${line.displayQuantity}`}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#111311] sm:mt-0"
                    />

                    <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <div className="flex flex-col">
                        <span
                          className={`text-[15px] font-medium leading-5 break-words ${
                            isChecked ? "text-primary-700" : "text-ink-900"
                          }`}
                        >
                          {displayName}
                        </span>
                        {line.preparation && (
                          <span className="text-[13px] text-ink-500">Prep: {line.preparation}</span>
                        )}
                        {line.constraint && (
                          <span className="text-[12px] font-medium text-ink-700">
                            Note: {line.constraint}
                          </span>
                        )}
                        {line.note && <span className="text-[13px] text-ink-500">{line.note}</span>}
                        {subsText && (
                          <span className="text-[12px] text-ink-500">
                            Swappable with: {subsText}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end">
                        <span className="tnum text-[15px] font-semibold text-ink-900">
                          {line.displayQuantity}
                        </span>
                        {line.approximate && (
                          <span className="text-[11px] text-ink-500">(approx)</span>
                        )}
                        {line.requiresManual && (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                            Manual adjustment
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5 sm:pt-0">
                      <Badge tone={line.role === "required" ? "white" : "info"}>
                        {ROLE_LABELS[line.role]}
                      </Badge>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Section 3: Preparation (Mise en place) */}
        {preparation.length > 0 && (
          <section aria-labelledby="section-preparation" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="section-preparation" className="text-[20px] font-semibold text-ink-900">
                    Preparation (Mise en place)
                  </h2>
                  <span className="rounded-full bg-surface-200 px-2.5 py-0.5 text-[12px] font-medium text-ink-700">
                    {preparedCount}/{totalPrepCount} ready
                  </span>
                </div>
                <p className="text-[13px] text-ink-500">
                  Prep, wash, and measure ingredients before lighting the stove.
                </p>
              </div>

              {/* Prep Checklist Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={allPrepared ? resetPrepared : markAllPrepared}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line-default bg-white px-3 py-1.5 text-[12px] font-medium text-ink-700 transition hover:bg-surface-100 focus-visible:outline-2 focus-visible:outline-info-700"
                >
                  {allPrepared ? "Reset checklist" : "Mark all ready"}
                </button>
              </div>
            </div>

            {/* Preparation Groups */}
            <div className="flex flex-col gap-5">
              {prepGroups.map((group) => {
                const groupPreparedCount = group.items.filter(
                  (item) => !!preparedItems[item.id],
                ).length;
                const isGroupAllDone = groupPreparedCount === group.items.length;

                return (
                  <div
                    key={group.category}
                    className="flex flex-col gap-3 rounded-3xl bg-surface-100 p-4 sm:p-5"
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-ink-900">{group.label}</h3>
                        <span className="text-[12px] text-ink-500">
                          ({groupPreparedCount}/{group.items.length})
                        </span>
                      </div>
                      {isGroupAllDone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-800">
                          <Check size={11} strokeWidth={3} />
                          Group done
                        </span>
                      )}
                    </div>

                    {/* Group Checklist Items */}
                    <ul className="flex flex-col gap-2.5">
                      {group.items.map((prep) => {
                        const isDone = !!preparedItems[prep.id];
                        const labelText = prep.ingredientName
                          ? `${prep.ingredientName}, ${prep.preparationState ?? "prepared"}`
                          : prep.instruction;

                        return (
                          <li key={prep.id} className="list-none">
                            <label
                              className={`flex min-h-[58px] cursor-pointer items-start gap-3.5 rounded-2xl border p-3.5 transition-all sm:items-center ${
                                isDone
                                  ? "border-primary-200 bg-primary-50/70 text-ink-900 shadow-none"
                                  : "border-line-default/60 bg-white hover:border-line-default hover:bg-surface-50 shadow-xs"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => togglePrepared(prep.id)}
                                aria-label={`Mark as prepared: ${labelText}`}
                                className="mt-1 h-5 w-5 shrink-0 accent-[#111311] sm:mt-0"
                              />

                              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                <div className="flex flex-col">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-[15px] font-semibold leading-5 break-words ${
                                        isDone
                                          ? "text-primary-900 line-through decoration-primary-400"
                                          : "text-ink-900"
                                      }`}
                                    >
                                      {prep.ingredientName ?? prep.instruction}
                                    </span>
                                    {prep.displayQuantity && (
                                      <span className="tnum rounded-md bg-surface-200 px-2 py-0.5 text-[12px] font-semibold text-ink-800">
                                        {prep.displayQuantity}
                                      </span>
                                    )}
                                  </div>

                                  {prep.preparationState && prep.ingredientName && (
                                    <span className="text-[13px] font-medium text-primary-700">
                                      {prep.preparationState}
                                    </span>
                                  )}

                                  {prep.detail && (
                                    <span className="text-[12px] text-ink-500">{prep.detail}</span>
                                  )}

                                  {prep.stepTimingAdvice && (
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink-500">
                                      <Clock size={11} strokeWidth={2} />
                                      {prep.stepTimingAdvice}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 shrink-0 sm:mt-0">
                                  {isDone ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-200 px-2.5 py-1 text-[11px] font-semibold text-primary-800">
                                      <Check size={12} strokeWidth={3} />
                                      Ready
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-surface-200 px-2.5 py-1 text-[11px] font-medium text-ink-600">
                                      To prep
                                    </span>
                                  )}
                                </div>
                              </div>
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

        {/* Section 4: Equipment */}
        {equipment.length > 0 && (
          <section aria-labelledby="section-equipment" className="flex flex-col gap-4">
            <h2 id="section-equipment" className="text-[20px] font-semibold text-ink-900">
              Equipment
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {equipment.map((eq: EquipmentItem) => (
                <div
                  key={eq.id}
                  className="flex items-start gap-3.5 rounded-2xl bg-surface-100 p-4"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-900 shadow-none">
                    {eq.iconType === "flame" && <Flame size={18} strokeWidth={1.75} />}
                    {eq.iconType === "timer" && <TimerIcon size={18} strokeWidth={1.75} />}
                    {eq.iconType === "knife" && <Utensils size={18} strokeWidth={1.75} />}
                    {eq.iconType === "colander" && <ChefHat size={18} strokeWidth={1.75} />}
                    {eq.iconType !== "flame" &&
                      eq.iconType !== "timer" &&
                      eq.iconType !== "knife" &&
                      eq.iconType !== "colander" && <Utensils size={18} strokeWidth={1.75} />}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-medium text-ink-900">{eq.name}</span>
                    <span className="text-[13px] leading-4 text-ink-500">{eq.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 5: Cooking Instructions */}
        <section aria-labelledby="section-instructions" className="flex flex-col gap-4">
          <div>
            <h2 id="section-instructions" className="text-[20px] font-semibold text-ink-900">
              Cooking instructions
            </h2>
            <p className="text-[13px] text-ink-500">
              {recipe.steps.length} sequential steps · Visual overview before Cooking Mode
            </p>
          </div>

          <ol className="flex flex-col gap-4">
            {recipe.steps.map((step) => {
              const usedIngredients = step.ingredientIds
                .map((id) => {
                  const line = recipe.ingredients.find((i) => i.id === id);
                  return line ? (nameMap.get(line.ingredientId) ?? line.ingredientId) : null;
                })
                .filter(Boolean);

              return (
                <li
                  key={step.id}
                  className="flex flex-col gap-3 rounded-3xl bg-surface-100 p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[13px] font-semibold text-primary-700">
                      {step.order}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {step.heat && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-ink-700">
                          <Flame aria-hidden size={13} strokeWidth={1.75} />
                          {HEAT_LABELS[step.heat] ?? step.heat}
                        </span>
                      )}
                      {step.timer && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-ink-700">
                          <Clock aria-hidden size={13} strokeWidth={1.75} />
                          {formatMinutes(Math.round(step.timer.durationSeconds / 60))}
                        </span>
                      )}
                      {step.estimatedMinutes && !step.timer && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-ink-700">
                          <Clock aria-hidden size={13} strokeWidth={1.75} />
                          {formatMinutes(step.estimatedMinutes)}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[16px] leading-[1.65] text-ink-900">{step.instruction}</p>

                  {stepCues(step).length > 0 && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-white p-3.5 text-[14px] leading-5 text-ink-700">
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
                    <div className="flex items-start gap-2 rounded-2xl bg-surface-200/50 px-3.5 py-2.5 text-[13px] text-ink-600">
                      <Info aria-hidden size={15} className="mt-0.5 shrink-0 text-ink-500" />
                      <span>
                        <strong className="font-medium text-ink-800">Done sign: </strong>
                        {step.completionNote}
                      </span>
                    </div>
                  )}

                  {usedIngredients.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[12px] text-ink-500">Uses:</span>
                      {usedIngredients.map((name) => (
                        <Badge key={name} tone="white">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Section 6: Notes & Tips */}
        {tips.length > 0 && (
          <section aria-labelledby="section-tips" className="flex flex-col gap-4">
            <h2 id="section-tips" className="text-[20px] font-semibold text-ink-900">
              Relevant notes and tips
            </h2>
            <div className="flex flex-col gap-3">
              {tips.map((tip, idx) => (
                <div key={idx} className="rounded-2xl bg-surface-100 p-4">
                  <h3 className="text-[15px] font-semibold text-ink-900">{tip.title}</h3>
                  <p className="mt-1 text-[14px] leading-5 text-ink-600">{tip.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Desktop Sticky Sidebar Column */}
      <aside aria-label="Cooking preparation" className="hidden lg:sticky lg:top-8 lg:block">
        <div className="flex flex-col gap-5 rounded-[32px] bg-surface-100 p-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-[18px] font-semibold text-ink-900">Ready to cook?</h3>
            <p className="text-[13px] leading-5 text-ink-500">
              Review ingredients or launch directly into cooking mode.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-[14px]">
            <div className="flex justify-between text-ink-700">
              <span>Total time:</span>
              <span className="tnum font-medium text-ink-900">{totalTimeLabel ?? "—"}</span>
            </div>
            {prepTimeLabel && cookTimeLabel && (
              <div className="flex justify-between text-[13px] text-ink-500">
                <span>Active time:</span>
                <span className="tnum">
                  {prepTimeLabel} prep · {cookTimeLabel} cook
                </span>
              </div>
            )}
            <div className="flex justify-between text-ink-700">
              <span>Servings:</span>
              <span className="tnum font-medium text-ink-900">{servings}</span>
            </div>
            {diffLabel && (
              <div className="flex justify-between text-ink-700">
                <span>Difficulty:</span>
                <span className="font-medium text-ink-900">{diffLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-700">
              <span>Required items:</span>
              <span className="tnum font-medium text-ink-900">
                {haveRequiredCount} / {requiredCount} checked
              </span>
            </div>
            {preparation.length > 0 && (
              <div className="flex justify-between text-ink-700">
                <span>Mise en place:</span>
                <span className="tnum font-medium text-ink-900">
                  {preparedCount} / {preparation.length} ready
                </span>
              </div>
            )}
          </div>

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

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-line-default bg-white/95 px-5 py-3.5 backdrop-blur-md lg:hidden">
        <div className="flex flex-col">
          <span className="tnum text-[12px] text-ink-500">{totalTimeLabel ?? "Cooking mode"}</span>
          <span className="text-[14px] font-semibold text-ink-900">Serves {servings}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={checkHref} className={buttonClasses({ variant: "secondary", size: "md" })}>
            Check
          </Link>
          <Button variant="primary" size="md" onClick={handleStartCooking}>
            <Play aria-hidden size={16} fill="currentColor" />
            Start cooking
          </Button>
        </div>
      </div>
    </div>
  );
}
