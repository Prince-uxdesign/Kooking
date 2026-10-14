"use client";

import { useSyncExternalStore } from "react";
import { GUEST_OWNER, sortSaved, withSaved, withoutSaved } from "@/shared/domain/saved";
import type { SavedRecipe } from "@/shared/domain/user";
import { LocalSaved, SAVED_KEY } from "./local";
import type { SavedRepository } from "./repositories";

/**
 * One in-memory view of the cook's saved recipes for the whole app
 * (Phase 33), so every save button for a recipe (card, featured card,
 * detail page, Saved screen) shows the same state at once.
 *
 * - Optimistic: the UI changes on tap; the write follows. If the write
 *   fails, the change is rolled back and `error` says why.
 * - Writes are queued, so fast repeated taps apply in order.
 * - Another tab's changes are picked up through the `storage` event.
 * - The repository is swappable: an account-backed one can replace
 *   local storage later without touching any component.
 */

export type SavedStatus = "loading" | "ready" | "unavailable";

export interface SavedSnapshot {
  status: SavedStatus;
  /** This owner's entries, newest first. */
  entries: SavedRecipe[];
  /** Plain-language problem from the last action, if it failed. */
  error: string | null;
  /** Short message for the one shared live region ("Saved Jollof rice."). */
  announcement: string;
}

const UNAVAILABLE =
  "Saved recipes can't be stored on this device right now (storage is blocked or full). You can still browse and cook.";
const WRITE_FAILED =
  "Couldn't update your saved recipes on this device. Storage may be full or blocked.";

export function createSavedStore(
  repo: SavedRepository,
  options: { ownerId?: string; now?: () => number } = {},
) {
  const ownerId = options.ownerId ?? GUEST_OWNER;
  const now = options.now ?? (() => Date.now());
  let snapshot: SavedSnapshot = { status: "loading", entries: [], error: null, announcement: "" };
  const listeners = new Set<() => void>();
  let loading: Promise<void> | null = null;
  let queue: Promise<void> = Promise.resolve();

  const set = (next: Partial<SavedSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const l of listeners) l();
  };

  function load(): Promise<void> {
    loading = repo
      .list(ownerId)
      .then((entries) => set({ status: "ready", entries: sortSaved(entries), error: null }))
      .catch(() => set({ status: "unavailable", entries: [], error: UNAVAILABLE }));
    return loading;
  }

  const store = {
    getSnapshot: () => snapshot,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      if (!loading) void load();
      return () => listeners.delete(listener);
    },

    /** Re-read storage (another tab changed it). Pending writes go first. */
    reload(): Promise<void> {
      return (queue = queue.then(load));
    },

    isSaved: (recipeId: string) => snapshot.entries.some((e) => e.recipeId === recipeId),

    /**
     * Save or unsave. `title` is used only for the announcement; nothing
     * but the id is stored. Resolves true when the change was saved.
     */
    async setSaved(
      recipeId: string,
      saved: boolean,
      title?: string,
      /** Keep an earlier save time (Undo puts the recipe back where it was). */
      savedAt?: number,
    ): Promise<boolean> {
      // Once loaded, the optimistic update happens in the same tick as the tap,
      // so back-to-back taps each see the previous one's result.
      if (snapshot.status === "loading") await (loading ?? load());
      const before = snapshot.entries;
      const already = before.some((e) => e.recipeId === recipeId);
      if (already === saved) return true; // nothing to do; never a duplicate
      const entry: SavedRecipe = { ownerId, recipeId, savedAt: savedAt ?? now() };
      const name = title ?? "Recipe";
      set({
        entries: saved
          ? sortSaved(withSaved(before, entry))
          : withoutSaved(before, ownerId, recipeId),
        error: null,
        announcement: saved ? `Saved ${name}.` : `Removed ${name} from saved.`,
      });

      const write = queue.then(() => (saved ? repo.save(entry) : repo.unsave(ownerId, recipeId)));
      queue = write.catch(() => undefined);
      try {
        await write;
        if (snapshot.status === "unavailable") set({ status: "ready" });
        return true;
      } catch {
        // Roll back just this recipe, leaving any other changes made meanwhile.
        const current = snapshot.entries;
        const restored = saved
          ? withoutSaved(current, ownerId, recipeId)
          : sortSaved(withSaved(current, before.find((x) => x.recipeId === recipeId) ?? entry));
        set({
          entries: restored,
          error: WRITE_FAILED,
          announcement: saved ? `Couldn't save ${name}.` : `Couldn't remove ${name}.`,
        });
        return false;
      }
    },

    /** Flip the current state, judged after the stored list has loaded. */
    async toggle(recipeId: string, title?: string): Promise<boolean> {
      if (snapshot.status === "loading") await (loading ?? load());
      return store.setSaved(recipeId, !store.isSaved(recipeId), title);
    },

    dismissError(): void {
      if (snapshot.error) set({ error: null });
    },
  };
  return store;
}

export type SavedStore = ReturnType<typeof createSavedStore>;

/* ------------------------------------------------------------------ */
/* The app's store                                                    */
/* ------------------------------------------------------------------ */

let appStore: SavedStore | null = null;

/** The single store the app uses (created on first use in the browser). */
export function savedStore(): SavedStore {
  if (!appStore) {
    appStore = createSavedStore(new LocalSaved());
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === null || e.key === SAVED_KEY) void appStore?.reload();
      });
    }
  }
  return appStore;
}

/**
 * Swap the store behind every saved button. This is the seam for accounts
 * later (an account-backed repository after sign-in) and for tests.
 * `null` goes back to the default local store on next use.
 */
export function replaceSavedStore(store: SavedStore | null): void {
  appStore = store;
}

const SERVER_SNAPSHOT: SavedSnapshot = {
  status: "loading",
  entries: [],
  error: null,
  announcement: "",
};

/** Saved state for components. Server render and first paint see "loading". */
export function useSavedRecipes(store: SavedStore = savedStore()) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);
  return {
    ...snap,
    isSaved: (recipeId: string) => snap.entries.some((e) => e.recipeId === recipeId),
    toggle: store.toggle,
    setSaved: store.setSaved,
    dismissError: store.dismissError,
    reload: store.reload,
  };
}
