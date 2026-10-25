"use client";

import { Bookmark } from "lucide-react";
import { useSavedRecipes } from "@/shared/data/saved-store";

const VARIANT = {
  /** White circle on a photo (RecipeCard). */
  card: {
    base: "bg-white/95 shadow-[0_2px_8px_rgb(21_18_15/0.12)] backdrop-blur hover:bg-white active:scale-90",
    on: "text-primary-700",
    off: "text-ink-700",
    icon: 16,
  },
  /** On the featured card. */
  featured: {
    base: "active:scale-90",
    on: "bg-primary-50 text-primary-700 hover:bg-primary-100",
    off: "bg-surface-100 text-ink-900 hover:bg-surface-200",
    icon: 18,
  },
  /** Beside a compact row card. */
  compact: {
    base: "relative z-10 bg-surface-100 hover:bg-surface-200 active:scale-90",
    on: "text-primary-700",
    off: "text-ink-700",
    icon: 16,
  },
} as const;

/**
 * Save toggle for a recipe card, wired to the shared saved-recipes store,
 * so every button for the same recipe updates together. The accessible
 * name stays "Save <title>"; `aria-pressed` says whether it's saved. The
 * change itself is announced once, app-wide, by `SavedAnnouncer`.
 */
export function SaveButton({
  recipeId,
  title,
  variant = "card",
  className = "",
}: {
  recipeId: string;
  title: string;
  variant?: keyof typeof VARIANT;
  className?: string;
}) {
  const saved = useSavedRecipes();
  const on = saved.isSaved(recipeId);
  const v = VARIANT[variant];
  return (
    <button
      type="button"
      onClick={(e) => {
        // The card is one big link; this button must not navigate.
        e.preventDefault();
        e.stopPropagation();
        void saved.toggle(recipeId, title);
      }}
      aria-label={`Save ${title}`}
      aria-pressed={on}
      title={on ? "Saved. Tap to remove" : "Save for later"}
      data-saved={on ? "true" : "false"}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[color,background-color,scale] duration-150 ease-out focus-visible:outline-3 focus-visible:outline-info-700 ${v.base} ${on ? v.on : v.off} ${className}`}
    >
      <Bookmark aria-hidden size={v.icon} strokeWidth={1.75} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
