"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CloudCheck,
  CloudOff,
  HardDrive,
  RefreshCw,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOptionalAuth } from "@/features/auth/AuthContext";
import { LocalShopping } from "@/shared/data/local";
import { getRemoteSyncService } from "@/shared/data/remote-sync";
import { kitchenCheckHref, recipeHref } from "@/shared/domain/navigation";
import {
  addPersonalItem,
  clearCompleted,
  emptyList,
  groupByAisle,
  groupByIngredient,
  removeItem,
  setItemChecked,
  updateItem,
  type ShoppingItem,
  type ShoppingList,
  type ValidDraft,
} from "@/shared/domain/shopping";
import { mergeShoppingLists } from "@/shared/domain/shopping-sync";
import { formatQuantity, type Unit } from "@/shared/domain/units";
import { PageHeader } from "@/shared/shell/PageHeader";
import { buttonClasses } from "@/shared/ui/Button";
import { Loading } from "@/shared/ui/States";
import { AddItemForm } from "./AddItemForm";
import { ItemEditor } from "./ItemEditor";
import { ShoppingItemRow } from "./ShoppingItemRow";

const shopping = new LocalShopping();
const UNDO_MS = 8000;

interface RecipeRef {
  recipeId: string;
  slug: string | undefined;
  title: string;
  servings: number | undefined;
  open: number;
}

function recipesOn(items: ShoppingItem[]): RecipeRef[] {
  const map = new Map<string, RecipeRef & { newest: number }>();
  for (const item of items) {
    if (item.origin !== "recipe" || !item.recipeId) continue;
    const prev = map.get(item.recipeId);
    const stamp = item.updatedAt ?? item.createdAt;
    const ref = prev ?? {
      recipeId: item.recipeId,
      slug: item.recipeSlug,
      title: item.recipeTitle ?? item.recipeSlug ?? "Recipe",
      servings: item.servingsContext,
      open: 0,
      newest: stamp,
    };
    if (!item.checked) ref.open += 1;
    if (stamp >= ref.newest) {
      ref.newest = stamp;
      ref.servings = item.servingsContext;
    }
    map.set(item.recipeId, ref);
  }
  return [...map.values()];
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function confirmationText(params: URLSearchParams, title: string, servings: number | null) {
  const added = Number(params.get("added") ?? 0);
  const updated = Number(params.get("updated") ?? 0);
  const removed = Number(params.get("removed") ?? 0);
  const parts: string[] = [];
  if (added > 0) parts.push(`${count(added, "ingredient")} added`);
  if (updated > 0) parts.push(`${count(updated, "item")} updated`);
  if (removed > 0) parts.push(`${count(removed, "item")} no longer needed removed`);
  const forWhat = `${title}${servings ? ` (${servings} servings)` : ""}`;
  return parts.length > 0
    ? `${parts.join(", ")} for ${forWhat}.`
    : `Your list already has everything ${forWhat} still needs.`;
}

function newId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `item_${rand}`;
}

/**
 * Shopping list: recipe items from Kitchen Check and the cook's own
 * items, in one list. Ticking records a purchase on the list only —
 * kitchen inventory is confirmed in Kitchen Check, never inferred.
 */
export function ShoppingListScreen() {
  const params = useSearchParams();
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const ownerId = user?.id ?? "guest";
  const isAuthenticated = auth?.status === "authenticated" && Boolean(user);

  const [list, setList] = useState<ShoppingList | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"guest" | "synced" | "syncing" | "error">(
    isAuthenticated ? "syncing" : "guest",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ text: string; previous: ShoppingList } | null>(null);
  const latest = useRef<ShoppingList | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        let currentList = await shopping.load(ownerId);

        // If authenticated, check if there are guest items from before signing in to merge
        if (isAuthenticated && user?.id) {
          const guestList = await shopping.load("guest");
          if (guestList && guestList.items.length > 0) {
            const mergedWithGuest = mergeShoppingLists(
              currentList ?? emptyList(ownerId, Date.now()),
              guestList,
              { ownerId },
            );
            currentList = mergedWithGuest.mergedList;
            await shopping.store(currentList);
            // Clear guest items so they don't re-merge indefinitely
            await shopping.store(emptyList("guest", Date.now()));
          }
        }

        if (!mounted) return;
        latest.current = currentList;
        setList(currentList);
        setLoaded(true);

        if (isAuthenticated && user?.id) {
          setSyncStatus("syncing");
          const res = await getRemoteSyncService().syncShoppingList(
            user.id,
            currentList ?? emptyList(ownerId, Date.now()),
          );
          if (!mounted) return;
          if (res.error) {
            setSyncStatus("error");
          } else {
            setSyncStatus("synced");
            latest.current = res.list;
            setList(res.list);
            await shopping.store(res.list);
          }
        } else {
          setSyncStatus("guest");
        }
      } catch {
        if (!mounted) return;
        setList(null);
        setLoaded(true);
      }
    }

    void loadData();

    return () => {
      mounted = false;
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [ownerId, isAuthenticated, user?.id]);

  const triggerSync = useCallback(
    async (targetList?: ShoppingList) => {
      const listToSync = targetList ?? latest.current;
      if (!isAuthenticated || !user?.id || !listToSync) return;
      setSyncStatus("syncing");
      try {
        const res = await getRemoteSyncService().syncShoppingList(user.id, listToSync);
        if (res.error) {
          setSyncStatus("error");
        } else {
          setSyncStatus("synced");
          if (res.list) {
            latest.current = res.list;
            setList(res.list);
            void shopping.store(res.list);
          }
        }
      } catch {
        setSyncStatus("error");
      }
    },
    [isAuthenticated, user?.id],
  );

  useEffect(() => {
    const handleOnline = () => {
      void triggerSync();
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [triggerSync]);

  const commit = useCallback(
    (next: ShoppingList) => {
      latest.current = next;
      setList(next);
      shopping.store(next).then(
        () => setSaveError(false),
        () => setSaveError(true),
      );

      if (isAuthenticated && user?.id) {
        void triggerSync(next);
      } else {
        setSyncStatus("guest");
      }
    },
    [isAuthenticated, user?.id, triggerSync],
  );

  const current = () => latest.current ?? emptyList(ownerId, Date.now());

  const offerUndo = (text: string, previous: ShoppingList) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ text, previous });
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const items = useMemo(() => list?.items ?? [], [list]);
  const active = items.filter((i) => !i.checked);
  const completed = items.filter((i) => i.checked);
  const aisles = useMemo(() => groupByAisle(items.filter((i) => !i.checked)), [items]);
  const groups = useMemo(() => new Map(groupByIngredient(items).map((g) => [g.key, g])), [items]);
  const groupOf = (item: ShoppingItem) =>
    groups.get(item.ingredientId ?? `name:${item.name.trim().toLowerCase()}`);
  const recipes = useMemo(() => recipesOn(items), [items]);
  const editing = items.find((i) => i.id === editingId) ?? null;

  const add = (value: ValidDraft) => {
    const result = addPersonalItem(current(), value, { id: newId(), now: Date.now() });
    if (result.outcome === "already-listed") {
      setStatus(`${value.name} is already on your list.`);
      return;
    }
    commit(result.list);
    if (result.outcome === "merged") {
      const merged = result.list.items.find((i) => i.id === result.itemId)!;
      setStatus(
        `Added to ${merged.name} already on your list. Now ${formatQuantity(merged.qty, merged.unit as Unit | null)}.`,
      );
    } else {
      setStatus(`${value.name} added.`);
    }
  };

  const toggle = (item: ShoppingItem) =>
    commit(setItemChecked(current(), item.id, !item.checked, Date.now()));

  const remove = (item: ShoppingItem) => {
    const before = current();
    commit(removeItem(before, item.id, Date.now()));
    setEditingId(null);
    offerUndo(`${item.name} removed.`, before);
  };

  const clearDone = () => {
    const before = current();
    const n = before.items.filter((i) => i.checked).length;
    commit(clearCompleted(before, Date.now()));
    offerUndo(`${count(n, "completed item")} cleared.`, before);
  };

  const restore = () => {
    if (!undo) return;
    commit({ ...undo.previous, updatedAt: Date.now() });
    setStatus("Restored.");
    setUndo(null);
  };

  const fromSlug = params.get("recipe");
  const fromServings = Number(params.get("servings")) || null;
  const origin = params.get("from");
  const fromRecipe = recipes.find((r) => r.slug === fromSlug);
  const backHref =
    fromSlug && fromServings
      ? kitchenCheckHref(fromSlug, { servings: fromServings, from: origin })
      : null;

  const rowProps = (item: ShoppingItem) => ({
    item,
    group: groupOf(item),
    onToggle: () => toggle(item),
    onEdit: () => setEditingId(item.id),
    showRecipe: true,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-8">
      {backHref && (
        <Link
          href={backHref}
          className={buttonClasses({ variant: "secondary", className: "w-fit pl-4 pr-5" })}
        >
          <ArrowLeft aria-hidden size={18} strokeWidth={1.75} />
          Back to Kitchen Check
        </Link>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Shopping List"
          description={
            loaded && items.length > 0
              ? `${count(active.length, "item")} left to buy.`
              : "What you still need, from recipes and your own."
          }
        />
        <div className="flex items-center gap-2 pt-1 sm:pt-2">
          {syncStatus === "guest" && (
            <span
              title="Items are saved privately on this browser"
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-[0.8125rem] text-ink-600"
            >
              <HardDrive size={15} aria-hidden />
              Saved on this device
            </span>
          )}
          {syncStatus === "syncing" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[0.8125rem] font-medium text-primary-700 animate-pulse">
              <RefreshCw size={15} className="animate-spin" aria-hidden />
              Syncing…
            </span>
          )}
          {syncStatus === "synced" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[0.8125rem] font-medium text-primary-700">
              <CloudCheck size={15} aria-hidden />
              Synced with account
            </span>
          )}
          {syncStatus === "error" && (
            <button
              type="button"
              onClick={() => void triggerSync()}
              title="Saved locally on this device. Click to retry syncing with your account."
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-[0.8125rem] text-ink-600 transition-colors hover:bg-surface-200"
            >
              <CloudOff size={15} className="text-ink-400" aria-hidden />
              <span>Offline · saved on device (Retry)</span>
            </button>
          )}
        </div>
      </div>

      {fromSlug && params.has("added") && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-3xl bg-primary-100 p-5 text-[0.9375rem] leading-6 text-ink-900"
        >
          <CheckCircle2 aria-hidden size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>
            {confirmationText(params, fromRecipe?.title ?? "this recipe", fromServings)} Your
            Kitchen Check answers are saved.
          </p>
        </div>
      )}

      <p className="text-[0.8125rem] text-ink-500">
        Checking items off records purchases on your list. Kitchen Check ingredient availability is
        confirmed separately.
      </p>

      <AddItemForm onAdd={add} />
      <p aria-live="polite" className="-mt-3 min-h-5 text-[0.8125rem] text-ink-500">
        {status}
      </p>

      {saveError && (
        <p
          role="alert"
          className="rounded-2xl bg-error-100 px-4 py-3 text-[0.875rem] text-error-700"
        >
          Couldn&apos;t save that change on this device. It will stay while this page is open.
        </p>
      )}

      {!loaded ? (
        <Loading label="Loading your list…" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface-100 px-6 py-12 text-center">
          <span
            aria-hidden
            className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-900"
          >
            <ShoppingBasket size={28} strokeWidth={1.75} />
          </span>
          <h2 className="text-[1.125rem] font-semibold text-ink-900">Your list is empty</h2>
          <p className="max-w-sm text-[0.9375rem] leading-6 text-ink-500">
            Type an item above to add it. Or run a Kitchen Check on a recipe and choose “Shop for
            missing ingredients”.
          </p>
          <Link
            href="/recipes"
            className={buttonClasses({ variant: "secondary", className: "mt-3" })}
          >
            Find a recipe
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {recipes.length > 0 && (
            <section aria-labelledby="list-recipes" className="flex flex-col gap-3">
              <h2 id="list-recipes" className="text-[1.0625rem] font-semibold text-ink-900">
                From recipes
              </h2>
              <ul className="flex flex-col gap-2">
                {recipes.map((r) => (
                  <li
                    key={r.recipeId}
                    className="flex flex-col gap-3 rounded-[20px] bg-surface-100 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-[0.9375rem] font-medium text-ink-900">
                        {r.title}
                      </p>
                      <p className="tnum text-[0.8125rem] text-ink-500">
                        {r.servings ? `${r.servings} servings · ` : ""}
                        {count(r.open, "item")} left
                      </p>
                    </div>
                    {r.slug && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {r.servings && (
                          <Link
                            href={kitchenCheckHref(r.slug, { servings: r.servings })}
                            className={buttonClasses({ variant: "light" })}
                          >
                            Kitchen Check
                          </Link>
                        )}
                        <Link
                          href={recipeHref(r.slug, { servings: r.servings })}
                          className={buttonClasses({ variant: "tertiary" })}
                        >
                          View recipe
                        </Link>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[0.8125rem] leading-5 text-ink-500">
                Ticking items doesn&apos;t change Kitchen Check. When you&apos;re home, update the
                amounts there to start cooking.
              </p>
            </section>
          )}

          <section aria-labelledby="list-active" className="flex flex-col gap-4">
            <h2 id="list-active" className="text-[1.25rem] font-semibold text-ink-900">
              To buy <span className="tnum font-normal text-ink-500">({active.length})</span>
            </h2>
            {active.length === 0 ? (
              <p className="rounded-[20px] bg-surface-100 p-4 text-[0.9375rem] text-ink-600">
                Nothing left to buy.
              </p>
            ) : (
              aisles.map((aisle) => (
                <div key={aisle.category} className="flex flex-col gap-2">
                  {aisle.label && (
                    <h3 className="text-[0.875rem] font-medium text-ink-600">{aisle.label}</h3>
                  )}
                  <ul className="flex flex-col gap-2">
                    {aisle.items.map((item) => (
                      <ShoppingItemRow key={item.id} {...rowProps(item)} />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          {completed.length > 0 && (
            <section aria-labelledby="list-done" className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="list-done" className="text-[1.25rem] font-semibold text-ink-900">
                  Completed{" "}
                  <span className="tnum font-normal text-ink-500">({completed.length})</span>
                </h2>
                <button
                  type="button"
                  onClick={clearDone}
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Clear completed
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {completed.map((item) => (
                  <ShoppingItemRow key={item.id} {...rowProps(item)} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {undo && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-5 lg:bottom-8">
          <div
            role="status"
            className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-ink-900 py-2 pl-5 pr-2 text-[0.9375rem] text-white"
          >
            <span className="min-w-0 truncate">{undo.text}</span>
            <button
              type="button"
              onClick={restore}
              className={buttonClasses({ variant: "light", className: "shrink-0" })}
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {editing && (
        <ItemEditor
          key={editing.id}
          item={editing}
          onClose={() => setEditingId(null)}
          onSave={(value) => {
            commit(updateItem(current(), editing.id, value, Date.now()));
            setEditingId(null);
            setStatus(`${value.name} updated.`);
          }}
          onDelete={() => remove(editing)}
        />
      )}
    </div>
  );
}
