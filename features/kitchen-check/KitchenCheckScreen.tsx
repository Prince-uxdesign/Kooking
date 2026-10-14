"use client";

import { ArrowLeft, ArrowLeftRight, CheckCircle2, Play, ShoppingBasket, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cookHref, startCookingIfReady } from "@/features/recipes/start-cooking";
import { LocalKitchenChecks, LocalShopping } from "@/shared/data/local";
import {
  addShortagesToList,
  buildKitchenCheckView,
  emptyRecord,
  kitchenCheckKey,
  readinessHeadline,
  resolveServings,
  withEntry,
  withSubstitution,
  type KitchenCheckEntry,
  type KitchenCheckRecord,
} from "@/shared/domain/kitchen-check";
import { recipeHref } from "@/shared/domain/navigation";
import type { ResumeSummary } from "@/shared/domain/recovery";
import type { Recipe } from "@/shared/domain/recipe-schema";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { Button, buttonClasses } from "@/shared/ui/Button";
import { AlternativesSheet } from "./AlternativesSheet";
import { KitchenCheckRow } from "./KitchenCheckRow";

const checks = new LocalKitchenChecks();
const shopping = new LocalShopping();
const OWNER_ID = "guest";

type Notice = { tone: "info" | "error"; text: string; href?: string; hrefLabel?: string };

/**
 * Kitchen Check screen. Owns only this check's state: what the cook
 * entered, keyed by recipe version + servings. Every verdict comes
 * from `buildKitchenCheckView`, which defers to the readiness engine.
 */
export function KitchenCheckScreen({
  recipe,
  ingredientNames,
  ingredientCategories = {},
}: {
  recipe: Recipe;
  ingredientNames: Record<string, string>;
  /** Catalog categories, used to place shopping items in an aisle. */
  ingredientCategories?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from");
  const { servings, adjusted } = resolveServings(params.get("servings"), recipe);
  const key = kitchenCheckKey(recipe, servings);

  const [record, setRecord] = useState<KitchenCheckRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState<ResumeSummary | null>(null);
  const latest = useRef<KitchenCheckRecord | null>(null);

  // Restore this context's answers after mount (storage is client-only).
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    checks
      .load(key)
      .then((found) => {
        if (cancelled) return;
        latest.current = found;
        setRecord(found);
      })
      .catch(() => {
        if (!cancelled) latest.current = null;
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const commit = useCallback(
    (update: (current: KitchenCheckRecord) => KitchenCheckRecord) => {
      const base = latest.current ?? emptyRecord(recipe, servings, Date.now());
      const next = update(base);
      if (next === base) return;
      latest.current = next;
      setRecord(next);
      checks.store(next).catch(() => {
        setNotice({
          tone: "error",
          text: "Couldn't save your answers on this device. They'll stay while this page is open.",
        });
      });
    },
    [recipe, servings],
  );

  const setEntry = (lineId: string, entry: KitchenCheckEntry | null) =>
    commit((r) => withEntry(r, lineId, entry, Date.now()));

  const view = useMemo(
    () => buildKitchenCheckView({ recipe, servings, record, ingredientNames }),
    [recipe, servings, record, ingredientNames],
  );

  const headline = readinessHeadline(view.summary);
  const backHref = recipeHref(recipe.slug, { servings, from });
  const hasWork = view.summary.toShop > 0;

  const shopForMissing = async () => {
    try {
      const existing = await shopping.load(OWNER_ID);
      const result = addShortagesToList(existing?.items ?? [], {
        recipe,
        servings,
        rows: view.rows,
        now: Date.now(),
        ingredientCategories,
      });
      await shopping.store({
        id: existing?.id ?? `list_${OWNER_ID}`,
        ownerId: OWNER_ID,
        items: result.items,
        updatedAt: Date.now(),
      });
      // Kitchen Check answers are already persisted; the list links back here.
      const query = new URLSearchParams({
        recipe: recipe.slug,
        servings: String(servings),
        added: String(result.added),
        updated: String(result.updated),
        removed: String(result.removed),
      });
      if (from) query.set("from", from);
      router.push(`/lists?${query.toString()}`);
    } catch {
      setNotice({
        tone: "error",
        text: "Couldn't update your shopping list on this device. Nothing was added.",
      });
    }
  };

  const readiness = view.readiness;

  const startCooking = async (replaceExisting = false) => {
    if (!readiness.canStartCooking || starting) return;
    setStarting(true);
    // Re-evaluated from stored answers; the on-screen verdict is not trusted.
    const result = await startCookingIfReady({
      recipe,
      servings,
      ingredientNames,
      replaceExisting,
    });
    if (!result.ok) {
      setStarting(false);
      if (result.reason === "conflict") {
        setConflict(result.existing);
        return;
      }
      setNotice({ tone: "error", text: result.message });
      return;
    }
    setConflict(null);
    router.push(result.href);
  };

  const scrollToRow = (lineId: string | undefined) => {
    if (!lineId) return;
    document
      .getElementById(`row-${lineId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const nextAction: { label: string; run: () => void } | null = (() => {
    switch (readiness.nextAction) {
      case "check-ingredients":
        return {
          label: "Go to next unchecked ingredient",
          run: () => scrollToRow(readiness.unchecked[0]?.lineId),
        };
      case "review-amounts":
        return {
          label: "Review amounts",
          run: () => scrollToRow(readiness.unresolved[0]?.lineId),
        };
      // "Shop" and "alternatives" already have their own buttons right above;
      // a second control with the same job would be a duplicate tab stop
      // (and, for alternatives, a different name for the same action).
      case "review-alternatives":
      case "shop":
        return null;
      default:
        return null;
    }
  })();

  const summaryLine =
    view.summary.needAttention > 0
      ? `${view.summary.needAttention} still ${view.summary.needAttention === 1 ? "needs" : "need"} attention`
      : (headline.detail ?? headline.title);

  const startDisabled = !loaded || !readiness.canStartCooking || starting;

  const actions = (
    <>
      <Button
        variant="secondary"
        size="lg"
        onClick={shopForMissing}
        disabled={!hasWork}
        aria-describedby="shop-hint"
        className="w-full"
      >
        <ShoppingBasket aria-hidden size={18} strokeWidth={1.75} />
        Shop for missing ingredients
      </Button>
      <p id="shop-hint" className="-mt-1 text-[0.8125rem] leading-5 text-ink-500">
        {hasWork
          ? `Adds ${view.summary.toShop} ${view.summary.toShop === 1 ? "item" : "items"} to your shopping list.`
          : "Nothing is marked missing or short yet."}
      </p>
      <Button
        variant="secondary"
        size="lg"
        onClick={() => setAlternativesOpen(true)}
        className="w-full"
      >
        <ArrowLeftRight aria-hidden size={18} strokeWidth={1.75} />
        Check alternatives
      </Button>
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24 lg:pb-8">
      <header className="flex flex-col gap-4">
        <Link
          href={backHref}
          className={buttonClasses({ variant: "secondary", className: "w-fit pl-4 pr-5" })}
        >
          <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
          Back to recipe
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.875rem] font-semibold leading-9 text-ink-900 sm:text-[2.125rem] sm:leading-[42px]">
            Kitchen Check
          </h1>
          <p className="text-[1rem] leading-6 text-ink-500">{recipe.title}</p>
          <p className="tnum inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-100 px-4 py-2.5 text-[0.875rem] text-ink-900">
            <Users aria-hidden size={16} strokeWidth={1.75} />
            <span className="font-medium">Serves {servings}</span>
            {servings !== recipe.baseServings && (
              <span className="text-ink-500">(recipe serves {recipe.baseServings})</span>
            )}
          </p>
        </div>
        {adjusted && (
          <p
            role="status"
            className="rounded-2xl bg-info-100 px-4 py-3 text-[0.875rem] text-info-700"
          >
            The serving count in the link wasn&apos;t valid, so this check uses {servings}. Go back
            to the recipe to change it.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
        <aside
          aria-label="Readiness"
          className="flex flex-col gap-4 rounded-3xl bg-surface-100 p-5 lg:sticky lg:top-8 lg:order-2"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-[1.25rem] font-semibold leading-7 text-ink-900" aria-live="polite">
              {headline.title}
            </h2>
            {headline.detail && (
              <p className="text-[0.9375rem] leading-6 text-ink-600" aria-live="polite">
                {headline.detail}
              </p>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Ingredients checked"
            aria-valuemin={0}
            aria-valuemax={view.summary.total}
            aria-valuenow={view.summary.checked}
            aria-valuetext={`${view.summary.checked} of ${view.summary.total} checked`}
            className="h-2 overflow-hidden rounded-full bg-surface-200"
          >
            <div
              className="h-full rounded-full bg-primary-500"
              style={{
                width: `${view.summary.total === 0 ? 0 : (view.summary.checked / view.summary.total) * 100}%`,
              }}
            />
          </div>

          {notice && (
            <div
              role={notice.tone === "error" ? "alert" : "status"}
              className={`flex flex-col gap-2 rounded-2xl px-4 py-3 text-[0.875rem] leading-5 ${
                notice.tone === "error" ? "bg-error-100 text-error-700" : "bg-white text-ink-900"
              }`}
            >
              <p>{notice.text}</p>
              {notice.href && (
                <Link href={notice.href} className="font-medium underline underline-offset-4">
                  {notice.hrefLabel}
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">{actions}</div>

          <div className="hidden flex-col gap-2 lg:flex">
            <Button
              variant="primary"
              size="lg"
              disabled={startDisabled}
              onClick={() => startCooking()}
              aria-describedby="start-hint-lg"
              className="w-full"
            >
              <Play aria-hidden size={18} fill="currentColor" />
              Start cooking
            </Button>
            {readiness.canStartCooking ? (
              <p
                id="start-hint-lg"
                className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-success-700"
              >
                <CheckCircle2 aria-hidden size={18} strokeWidth={1.75} />
                Ready to cook. Everything required is covered.
              </p>
            ) : (
              <>
                <p id="start-hint-lg" className="text-[0.8125rem] leading-5 text-ink-500">
                  {readiness.blockedReason}
                </p>
                {nextAction && (
                  <button
                    type="button"
                    onClick={nextAction.run}
                    className="min-h-[44px] self-start rounded-full px-4 text-[0.875rem] font-medium text-ink-900 underline underline-offset-4 hover:bg-white"
                  >
                    {nextAction.label}
                  </button>
                )}
              </>
            )}
          </div>
        </aside>

        <section aria-labelledby="check-list" className="flex flex-col gap-4 lg:order-1">
          <div>
            <h2 id="check-list" className="text-[1.25rem] font-semibold text-ink-900">
              Ingredients for {servings}
            </h2>
            <p className="text-[0.8125rem] text-ink-500">
              Tell us what you have. Nothing is assumed until you answer.
            </p>
          </div>
          {view.rows.length === 0 ? (
            <p className="rounded-3xl bg-surface-100 p-5 text-[0.9375rem] text-ink-600">
              This recipe has no ingredients to check.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {view.rows.map((row) => (
                <KitchenCheckRow
                  key={row.lineId}
                  row={row}
                  alternativeNames={row.approvedSubstitutes.map((id) => ingredientNames[id] ?? id)}
                  onChange={(entry) => setEntry(row.lineId, entry)}
                  onOpenAlternatives={() => setAlternativesOpen(true)}
                  onClearSubstitution={() =>
                    commit((r) => withSubstitution(r, recipe, row.lineId, null, Date.now()))
                  }
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Phones/tablets: summary + Start cooking stay reachable above the tab bar. */}
      <div className="sticky bottom-24 z-30 lg:hidden">
        <div className="flex items-center gap-3 rounded-[28px] bg-white p-2 pl-5 ring-1 ring-line-strong">
          <div className="min-w-0 flex-1">
            <p className="tnum line-clamp-2 text-[0.875rem] font-medium leading-5 text-ink-900">
              {summaryLine}
            </p>
            <p id="start-hint" className="truncate text-[0.8125rem] leading-4 text-ink-500">
              {readiness.canStartCooking ? "Ready to cook" : readiness.blockedReason}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={startDisabled}
            onClick={() => startCooking()}
            aria-describedby="start-hint"
            className="shrink-0"
          >
            <Play aria-hidden size={16} fill="currentColor" />
            Start cooking
          </Button>
        </div>
      </div>

      <BottomSheet
        title="Unfinished session"
        open={conflict !== null}
        onClose={() => setConflict(null)}
        footer={
          conflict && (
            <div className="flex flex-col gap-2.5">
              <Link
                href={cookHref(conflict.sessionId)}
                className={buttonClasses({ variant: "primary", size: "lg", className: "w-full" })}
              >
                Continue that session
              </Link>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => startCooking(true)}
                disabled={starting}
                className="w-full"
              >
                End it and start for {servings} servings
              </Button>
            </div>
          )
        }
      >
        {conflict && (
          <div className="flex flex-col gap-3 text-left text-[0.9375rem] leading-6 text-ink-700">
            <p>
              You&apos;re already cooking {conflict.title} for{" "}
              <strong className="font-medium text-ink-900">{conflict.servings} servings</strong>
              {conflict.stepLabel ? `, on ${conflict.stepLabel.toLowerCase()}` : ""}
              {conflict.paused ? " (paused)" : ""}.
            </p>
            {conflict.timers.length > 0 && (
              <p>
                Timers:{" "}
                {conflict.timers.map((t) => `${t.label}, ${t.text.toLowerCase()}`).join("; ")}.
              </p>
            )}
            <p>Starting again ends that session. Its progress stays in your history.</p>
          </div>
        )}
      </BottomSheet>

      <AlternativesSheet
        open={alternativesOpen}
        onClose={() => setAlternativesOpen(false)}
        rows={view.rows}
        names={ingredientNames}
        onUseSubstitute={(lineId, substituteId) => {
          const current = view.rows.find((r) => r.lineId === lineId);
          const already = current?.state === "alternative" && current.substitutedBy !== null;
          commit((r) =>
            withSubstitution(
              r,
              recipe,
              lineId,
              already && current.substitutedBy === (ingredientNames[substituteId] ?? substituteId)
                ? null
                : substituteId,
              Date.now(),
            ),
          );
        }}
      />
    </div>
  );
}
