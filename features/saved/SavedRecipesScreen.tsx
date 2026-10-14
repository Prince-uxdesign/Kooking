"use client";

import { AlertTriangle, Bookmark, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSavedRecipes } from "@/shared/data/saved-store";
import type { RecipeSummary } from "@/shared/domain/discovery";
import { SAVED_FILTER_THRESHOLD, filterSaved, resolveSaved } from "@/shared/domain/saved";
import type { SavedRecipe } from "@/shared/domain/user";
import { buttonClasses } from "@/shared/ui/Button";
import { RecipeGrid } from "@/shared/ui/RecipeGrid";
import { SearchInput } from "@/shared/ui/SearchInput";
import { EmptyState, ErrorState, Loading } from "@/shared/ui/States";

const count = (n: number) => `${n} saved ${n === 1 ? "recipe" : "recipes"}`;

/**
 * The Saved screen (Phase 33). Lists the cook's saved recipes, newest
 * first, from the live catalog: titles, photos and availability are never
 * taken from storage. Removing is the card's bookmark, with Undo.
 * Opening a card leads to the recipe, then Kitchen Check and Cooking Mode
 * as usual; nothing here needs an account.
 */
export function SavedRecipesScreen({ catalog }: { catalog: RecipeSummary[] }) {
  const saved = useSavedRecipes();
  const [query, setQuery] = useState("");
  const { available, unavailable } = resolveSaved(saved.entries, catalog);
  const shown = filterSaved(available, query);

  // Undo for a recipe removed while this screen is open. The bookmark that was
  // pressed disappears with its card, so focus moves to Undo instead of the page.
  const [removed, setRemoved] = useState<{ entry: SavedRecipe; title: string } | null>(null);
  const previous = useRef<SavedRecipe[] | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const focusUndo = useRef(false);
  useEffect(() => {
    const before = previous.current;
    previous.current = saved.status === "ready" ? saved.entries : null;
    if (!before || saved.status !== "ready") return;
    const gone = before.find((b) => !saved.entries.some((e) => e.recipeId === b.recipeId));
    const recipe = gone && catalog.find((r) => r.id === gone.recipeId);
    if (gone && recipe) {
      // Browsers may still report the removed button as active until their
      // focus fix-up runs, so a disconnected element counts as lost too.
      const active = document.activeElement;
      const focusLost = !active || active === document.body || !active.isConnected;
      focusUndo.current = focusLost;
      setRemoved({ entry: gone, title: recipe.title });
    }
  }, [saved.entries, saved.status, catalog]);
  // Runs after the Undo button exists (a timer could fire before React renders it).
  useEffect(() => {
    if (removed && focusUndo.current) {
      focusUndo.current = false;
      undoRef.current?.focus();
    }
  }, [removed]);

  if (saved.status === "loading") {
    return <Loading label="Loading your saved recipes…" />;
  }

  if (saved.status === "unavailable") {
    return (
      <ErrorState
        headingLevel={2}
        title="Saved recipes aren't available on this device"
        message="This browser isn't letting Kooking store data (private browsing or blocked site data can do this). You can still browse recipes and cook."
        onRetry={() => void saved.reload()}
      />
    );
  }

  const undo = removed && (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface-100 px-5 py-3 text-[0.9375rem] text-ink-900"
    >
      <p className="min-w-0 break-words">
        Removed <span className="font-medium">{removed.title}</span> from saved.
      </p>
      <button
        ref={undoRef}
        type="button"
        onClick={() => {
          const { entry, title } = removed;
          setRemoved(null);
          void saved.setSaved(entry.recipeId, true, title, entry.savedAt);
        }}
        className={buttonClasses({ variant: "secondary", size: "md", className: "bg-white" })}
      >
        <RotateCcw aria-hidden size={16} strokeWidth={1.75} />
        Undo
      </button>
    </div>
  );

  const unavailableNotice = unavailable.length > 0 && (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl bg-warning-100 px-5 py-4 text-[0.9375rem] leading-6 text-warning-700">
      <p className="inline-flex min-w-0 flex-1 basis-[16rem] items-start gap-2">
        <AlertTriangle aria-hidden size={18} strokeWidth={1.75} className="mt-1 shrink-0" />
        {unavailable.length === 1
          ? "1 saved recipe is no longer available on Kooking. It may have been removed or is being updated."
          : `${unavailable.length} saved recipes are no longer available on Kooking. They may have been removed or are being updated.`}
      </p>
      <button
        type="button"
        onClick={() => {
          for (const id of unavailable) void saved.setSaved(id, false, "Unavailable recipe");
        }}
        className={buttonClasses({ variant: "secondary", size: "md", className: "bg-white" })}
      >
        Remove {unavailable.length === 1 ? "it" : "them"}
      </button>
    </div>
  );

  if (available.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {undo}
        {unavailableNotice}
        <EmptyState
          headingLevel={2}
          title="No saved recipes yet"
          message="Tap the bookmark on any recipe to keep it here for later. Saved recipes stay on this device; no account needed."
          action={
            <Link
              href="/recipes"
              className={buttonClasses({ variant: "primary", className: "mt-3" })}
            >
              Explore recipes
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {undo}
      {unavailableNotice}

      <div className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-[0.9375rem] text-ink-500">
          <Bookmark aria-hidden size={16} strokeWidth={1.75} />
          {count(available.length)} · most recently saved first
        </p>
        {available.length > SAVED_FILTER_THRESHOLD && (
          <SearchInput
            label="Filter saved recipes"
            value={query}
            onChange={setQuery}
            placeholder="Filter by name or category"
          />
        )}
        {query.trim() !== "" && (
          <p role="status" className="text-[0.875rem] text-ink-500">
            {shown.length === 0
              ? `No saved recipes match “${query.trim()}”.`
              : `${shown.length} of ${count(available.length)}`}
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          className={buttonClasses({ variant: "secondary", className: "w-fit" })}
        >
          Show all saved recipes
        </button>
      ) : (
        <section aria-labelledby="saved-list-heading">
          <h2 id="saved-list-heading" className="sr-only">
            Your saved recipes
          </h2>
          <RecipeGrid recipes={shown} from="/saved" />
        </section>
      )}
    </div>
  );
}
