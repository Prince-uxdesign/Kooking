import { afterEach, beforeEach, describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { startCookingIfReady } from "../../features/recipes/start-cooking";
import { LocalKitchenChecks, LocalSessions, SESSIONS_BACKUP_PREFIX } from "../data/local";
import { StoreError } from "../data/repositories";
import { advanceStep, resolveSession, type CatalogEntry } from "./cooking-session";
import { emptyRecord } from "./kitchen-check";
import { recipeSchema } from "./recipe-schema";
import { isNewerThan, resumeSummary, salvageSession } from "./recovery";
import { applySessionTimer, startSession, transitionSession, type CookingSession } from "./session";

const recipe = recipeSchema.parse(seedJson);
const T0 = 1_800_000_000_000;
const MIN = 60_000;
const KEY = "kooking:sessions:v1";
const TIMER = "timer:demo-step-2";
const catalog: Record<string, CatalogEntry> = {
  [recipe.id]: { title: recipe.title, slug: recipe.slug, contentVersion: recipe.contentVersion },
};
const make = (id = "s1", servings = 4, now = T0) =>
  startSession({ id, recipe, servings, now, lineNames: new Map() });

let store: Map<string, string>;
let failWrites = false;
beforeEach(() => {
  store = new Map();
  failWrites = false;
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (failWrites) throw new DOMException("QuotaExceededError");
        store.set(k, v);
      },
      removeItem: (k: string) => void store.delete(k),
    },
  };
});
afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

/** "Reopen Kooking": a brand-new adapter reading what's on disk. */
const reopen = async (id: string, now: number) =>
  resolveSession(await new LocalSessions().getRaw(id), catalog, now);

describe("restoring a session", () => {
  it("survives a refresh, navigating away and closing the tab", async () => {
    let s = advanceStep(make(), T0 + MIN);
    s = applySessionTimer(s, TIMER, "start", T0 + 2 * MIN);
    await new LocalSessions().store(s);
    const view = await reopen("s1", T0 + 5 * MIN);
    expect(view.kind).toBe("cooking");
    if (view.kind === "cooking") {
      expect(view.stepIndex).toBe(1);
      expect(view.session.completedStepIds).toEqual(s.completedStepIds);
      expect(view.session.servings).toBe(4);
      expect(view.session.contentVersion).toBe(recipe.contentVersion);
      expect(view.session.timers[0]).toMatchObject({ status: "running", endsAt: T0 + 12 * MIN });
    }
  });

  it("restores a paused session as paused", async () => {
    await new LocalSessions().store(transitionSession(advanceStep(make(), T0), "pause", T0 + MIN));
    const view = await reopen("s1", T0 + 90 * MIN);
    expect(view.kind === "cooking" && view.session.status).toBe("paused");
  });

  it("restores a completed session as completed (never reopened)", async () => {
    const done = transitionSession(make(), "complete", T0 + MIN);
    await new LocalSessions().store(done);
    expect((await reopen("s1", T0 + 99 * MIN)).kind).toBe("completed");
  });
});

describe("timer recovery", () => {
  it("shows a timer that ran out while closed as finished, not restarted", async () => {
    await new LocalSessions().store(applySessionTimer(advanceStep(make(), T0), TIMER, "start", T0));
    const view = await reopen("s1", T0 + 40 * MIN);
    expect(view.kind).toBe("cooking");
    if (view.kind === "cooking") {
      expect(view.session.timers[0]).toMatchObject({ status: "done", finishedAt: T0 + 10 * MIN });
      expect(view.session.completedStepIds).toHaveLength(1); // only step 1, done by the cook
    }
  });

  it("keeps a paused timer's remaining time", async () => {
    let s = applySessionTimer(advanceStep(make(), T0), TIMER, "start", T0);
    s = applySessionTimer(s, TIMER, "pause", T0 + 3 * MIN);
    await new LocalSessions().store(s);
    const view = await reopen("s1", T0 + 300 * MIN);
    expect(view.kind === "cooking" && view.session.timers[0]).toMatchObject({
      status: "paused",
      remainingMs: 7 * MIN,
    });
  });
});

describe("resumeSummary", () => {
  it("gives the prompt its step and timer context as of now", () => {
    let s = applySessionTimer(advanceStep(make(), T0), TIMER, "start", T0);
    expect(resumeSummary(s, T0 + 6 * MIN)).toMatchObject({
      sessionId: "s1",
      title: recipe.title,
      servings: 4,
      paused: false,
      stepLabel: "Step 2 of 3",
      stepInstruction: recipe.steps[1].instruction,
      timers: [{ label: "Simmer base", state: "running", text: "4:00 left" }],
    });
    expect(resumeSummary(s, T0 + 12 * MIN).timers[0]).toMatchObject({
      state: "done",
      text: "Time's up",
    });
    s = applySessionTimer(s, TIMER, "pause", T0 + MIN);
    expect(resumeSummary(transitionSession(s, "pause", T0 + MIN), T0 + 60 * MIN)).toMatchObject({
      paused: true,
      timers: [{ state: "paused", text: "Paused, 9:00 left" }],
    });
  });

  it("handles sessions without a step copy", () => {
    expect(resumeSummary({ ...make(), steps: [] }, T0)).toMatchObject({
      stepLabel: null,
      stepInstruction: null,
    });
  });
});

describe("multiple unfinished sessions", () => {
  it("lists every open session, most recent first", async () => {
    const repo = new LocalSessions();
    await repo.store(make("a", 4, T0));
    await repo.store({ ...make("b", 2, T0), recipeId: "other", updatedAt: T0 + 5 });
    await repo.store(transitionSession(make("c", 4, T0), "complete", T0 + 9));
    expect((await repo.listResumable()).map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("asks instead of silently ending an open session for the same recipe", async () => {
    const checks = new LocalKitchenChecks();
    for (const servings of [4, 6]) {
      await checks.store({
        ...emptyRecord(recipe, servings, 1),
        entries: {
          "demo-rice": { have: true, qtyText: "2000", unit: "g" },
          "demo-tomato-paste": { have: true, qtyText: "500", unit: "g" },
        },
      });
    }
    const first = await startCookingIfReady({ recipe, servings: 4, ingredientNames: {} });
    expect(first.ok).toBe(true);
    const again = await startCookingIfReady({ recipe, servings: 4, ingredientNames: {} });
    expect(again).toMatchObject({ ok: true, resumed: true });

    const other = await startCookingIfReady({ recipe, servings: 6, ingredientNames: {} });
    expect(other).toMatchObject({ ok: false, reason: "conflict" });
    if (!other.ok && other.reason === "conflict") {
      expect(other.existing).toMatchObject({ servings: 4, stepLabel: "Step 1 of 3" });
    }
    expect(await new LocalSessions().listResumable()).toHaveLength(1);

    const replaced = await startCookingIfReady({
      recipe,
      servings: 6,
      ingredientNames: {},
      replaceExisting: true,
    });
    expect(replaced.ok).toBe(true);
    const open = await new LocalSessions().listResumable();
    expect(open.map((s) => s.servings)).toEqual([6]);
  });
});

describe("damaged and unreadable data", () => {
  it("keeps a damaged entry through other saves until the cook removes it", async () => {
    store.set(KEY, JSON.stringify([{ id: "bad", recipeSlug: "demo-tomato-rice", status: "?" }]));
    const repo = new LocalSessions();
    await repo.store(make("good"));
    await repo.store(advanceStep(make("good"), T0 + 1));
    expect(await repo.listDamaged()).toEqual([
      { id: "bad", recipeSlug: "demo-tomato-rice", status: "?" },
    ]);
    expect((await reopen("bad", T0)).kind).toBe("corrupt");
    await repo.remove("bad");
    expect(await repo.listDamaged()).toEqual([]);
    expect((await repo.getById("good")).currentStepIndex).toBe(1);
  });

  it("backs up an unreadable store before writing over it", async () => {
    store.set(KEY, "{oops");
    await new LocalSessions().store(make());
    const backups = [...store.keys()].filter((k) => k.startsWith(SESSIONS_BACKUP_PREFIX));
    expect(backups).toHaveLength(1);
    expect(store.get(backups[0])).toBe("{oops");
    expect((await reopen("s1", T0)).kind).toBe("cooking");
  });

  it("refuses to overwrite unreadable data it can't back up", async () => {
    store.set(KEY, "{oops");
    failWrites = true;
    await expect(new LocalSessions().store(make())).rejects.toBeInstanceOf(StoreError);
    expect(store.get(KEY)).toBe("{oops");
  });

  it("salvages what it can from a damaged entry", () => {
    expect(
      salvageSession({
        id: "x",
        recipeSlug: "demo-tomato-rice",
        recipeTitle: "Demo",
        servings: 6,
        currentStepIndex: 1,
        steps: [{}, {}, {}],
        status: "garbled",
      }),
    ).toEqual({
      id: "x",
      recipeSlug: "demo-tomato-rice",
      recipeTitle: "Demo",
      servings: 6,
      stepNumber: 2,
    });
    expect(
      salvageSession({ recipeSlug: "Not A Slug!", servings: 99, recipeTitle: "T" }),
    ).toMatchObject({
      recipeSlug: null,
      servings: null,
    });
    expect(salvageSession({ id: "x" })).toBeNull();
    expect(salvageSession("nope")).toBeNull();
  });
});

describe("failed saves", () => {
  it("reports a full or blocked store and leaves the last saved copy intact", async () => {
    const repo = new LocalSessions();
    await repo.store(make());
    failWrites = true;
    await expect(repo.store(advanceStep(make(), T0 + 1))).rejects.toBeInstanceOf(StoreError);
    failWrites = false;
    expect((await repo.getById("s1")).currentStepIndex).toBe(0);
  });
});

describe("recipe versions", () => {
  it("keeps the session's own instructions when the recipe is republished", async () => {
    await new LocalSessions().store(make());
    const newer = { [recipe.id]: { ...catalog[recipe.id], contentVersion: 99 } };
    const view = resolveSession(await new LocalSessions().getRaw("s1"), newer, T0);
    expect(view.kind === "cooking" && view.recipeUpdated).toBe(true);
    expect(view.kind === "cooking" && view.step.instruction).toBe(recipe.steps[0].instruction);
  });

  it("still opens from its copy when the recipe is gone from the catalog", async () => {
    await new LocalSessions().store(make());
    const view = resolveSession(await new LocalSessions().getRaw("s1"), {}, T0);
    expect(view.kind === "cooking" && view.recipeMissing).toBe(true);
  });

  it("offers a safe path when no step copy exists", async () => {
    const legacy = { ...make() } as Record<string, unknown>;
    delete legacy.steps;
    store.set(KEY, JSON.stringify([legacy]));
    expect((await reopen("s1", T0)).kind).toBe("no-snapshot");
  });
});

describe("two tabs", () => {
  it("detects newer progress saved elsewhere", () => {
    const mine: CookingSession = make();
    expect(isNewerThan({ ...mine, updatedAt: mine.updatedAt + 1 }, mine)).toBe(true);
    expect(isNewerThan(mine, mine)).toBe(false);
    expect(isNewerThan(null, mine)).toBe(false);
    expect(isNewerThan({ updatedAt: "soon" }, mine)).toBe(false);
  });
});
