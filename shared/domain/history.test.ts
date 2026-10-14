import { afterEach, describe, expect, it } from "vitest";
import { LocalHistory, LocalSessions } from "@/shared/data/local";
import { MemoryHistory, MemorySessions } from "@/shared/data/memory";
import type { RecipeSummary } from "./discovery";
import { RECENT_VIEWS_CAP, recordView, resolveRecentlyViewed } from "./history";
import { isResumable, pickResumable, resumeProgressLabel, type CookingSession } from "./session";

function summary(id: string): RecipeSummary {
  return {
    id,
    slug: id,
    title: id,
    totalMinutes: 30,
    servings: 4,
    stepCount: 5,
    categories: ["rice"],
    demo: true,
  };
}

function session(id: string, status: CookingSession["status"], updatedAt: number) {
  return {
    id,
    recipeId: "demo-tomato-rice",
    recipeSlug: "demo-tomato-rice",
    contentVersion: 1,
    servings: 4,
    currentStepIndex: 1,
    completedStepIds: [],
    timers: [],
    snapshot: [],
    status,
    createdAt: 0,
    updatedAt,
  } satisfies CookingSession;
}

/** Minimal localStorage stand-in for the node test environment. */
function installStorage(options: { blocked?: boolean } = {}) {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => {
      if (options.blocked) throw new Error("SecurityError");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (options.blocked) throw new Error("SecurityError");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  };
  (globalThis as { window?: unknown }).window = { localStorage: storage };
  return data;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("recently viewed", () => {
  it("records newest first, de-duplicates, and caps", () => {
    let views = recordView([], "a", 1);
    views = recordView(views, "b", 2);
    views = recordView(views, "a", 3);
    expect(views).toEqual([
      { recipeId: "a", viewedAt: 3 },
      { recipeId: "b", viewedAt: 2 },
    ]);
    for (let i = 0; i < 30; i++) views = recordView(views, `r${i}`, 10 + i);
    expect(views).toHaveLength(RECENT_VIEWS_CAP);
    expect(views[0].recipeId).toBe("r29");
  });

  it("resolves against the catalog, skipping removed recipes", () => {
    const views = [
      { recipeId: "gone", viewedAt: 9 },
      { recipeId: "b", viewedAt: 5 },
      { recipeId: "a", viewedAt: 7 },
    ];
    const resolved = resolveRecentlyViewed(views, [summary("a"), summary("b")]);
    expect(resolved.map((r) => r.id)).toEqual(["a", "b"]);
    expect(resolveRecentlyViewed(views, [summary("a"), summary("b")], 1)).toHaveLength(1);
    expect(resolveRecentlyViewed([], [summary("a")])).toEqual([]);
  });

  it("memory and local adapters persist history", async () => {
    const memory = new MemoryHistory();
    await memory.record("a", 1);
    expect(await memory.list()).toEqual([{ recipeId: "a", viewedAt: 1 }]);

    const data = installStorage();
    const local = new LocalHistory();
    expect(await local.list()).toEqual([]);
    await local.record("a", 1);
    await local.record("b", 2);
    expect((await local.list()).map((v) => v.recipeId)).toEqual(["b", "a"]);
    data.set("kooking:recent:v1", "{not json");
    expect(await local.list()).toEqual([]);
  });

  it("blocked storage reads as empty instead of crashing", async () => {
    installStorage({ blocked: true });
    expect(await new LocalHistory().list()).toEqual([]);
    expect(await new LocalSessions().latestResumable()).toBeNull();
    await expect(new LocalHistory().record("a", 1)).rejects.toThrow(/full or blocked/);
  });
});

describe("continue cooking", () => {
  it("only active or paused sessions are resumable", () => {
    expect(isResumable(session("s", "active", 1))).toBe(true);
    expect(isResumable(session("s", "paused", 1))).toBe(true);
    expect(isResumable(session("s", "completed", 1))).toBe(false);
    expect(isResumable(session("s", "abandoned", 1))).toBe(false);
  });

  it("picks the most recently updated resumable session", () => {
    expect(pickResumable([])).toBeNull();
    expect(pickResumable([session("done", "completed", 9)])).toBeNull();
    expect(
      pickResumable([
        session("old", "paused", 1),
        session("done", "completed", 9),
        session("new", "active", 5),
        session("quit", "abandoned", 8),
      ])?.id,
    ).toBe("new");
  });

  it("labels progress, clamping stale indexes, and omits it when unknown", () => {
    expect(resumeProgressLabel(session("s", "active", 1), 8)).toBe("Step 2 of 8");
    expect(resumeProgressLabel({ ...session("s", "active", 1), currentStepIndex: 20 }, 3)).toBe(
      "Step 3 of 3",
    );
    expect(resumeProgressLabel(session("s", "active", 1), null)).toBeNull();
  });

  it("session adapters expose the latest resumable session", async () => {
    const memory = new MemorySessions();
    await memory.store(session("a", "completed", 5));
    expect(await memory.latestResumable()).toBeNull();
    await memory.store(session("b", "paused", 2));
    expect((await memory.latestResumable())?.id).toBe("b");

    installStorage();
    const local = new LocalSessions();
    expect(await local.latestResumable()).toBeNull();
    await local.store(session("c", "active", 3));
    await local.store(session("d", "abandoned", 4));
    expect((await local.latestResumable())?.id).toBe("c");
  });
});
