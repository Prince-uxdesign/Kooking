"use client";

import { AlertTriangle, X } from "lucide-react";
import { useSavedRecipes } from "@/shared/data/saved-store";

/**
 * One place that tells the cook what happened to a save: a polite
 * screen-reader message ("Saved Jollof rice."), and a visible,
 * dismissible notice when storage refused the change. Mounted once in
 * the app shell so a recipe shown in several places isn't announced
 * several times.
 */
export function SavedAnnouncer() {
  const saved = useSavedRecipes();
  return (
    <>
      <p role="status" className="sr-only">
        {saved.announcement}
      </p>
      {saved.error && saved.status !== "unavailable" && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-md items-start gap-3 rounded-3xl bg-error-100 p-4 text-[0.875rem] leading-5 text-error-700 lg:bottom-8"
        >
          <AlertTriangle aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p className="flex-1">{saved.error}</p>
          <button
            type="button"
            onClick={saved.dismissError}
            aria-label="Dismiss"
            className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-error-100/60"
          >
            <X aria-hidden size={18} />
          </button>
        </div>
      )}
    </>
  );
}
