import { afterEach, beforeEach, describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { LocalSessions } from "../data/local";
import {
  createCookingSession,
  reconcileExisting,
  resolveSession,
  validateServings,
  type CatalogEntry,
} from "./cooking-session";
import { emptyRecord, type KitchenCheckEntry, type KitchenCheckRecord } from "./kitchen-check";
import { recipeSchema, type Recipe } from "./recipe-schema";
import { remainingMs } from "./timers";
import {
  ALLOWED_TRANSITIONS,
  SessionTransitionError,
  completeStep,
  goToStep,
  transitionSession,
  uncompleteStep,
  type CookingSession,
} from "./session";

const recipe = recipeSchema.parse(seedJson);
const NOW = 1_800_000_000_000;
const names: Record<string, string> = {
  "demo:long-grain-rice": "Long-grain rice",
  "demo:tomato-paste": "Tomato paste",
};
const have = (qty: string, unit: string): KitchenCheckEntry => ({ have: true, qtyText: qty, unit });
const ready = (servings = 4): KitchenCheckRecord => ({
  ...emptyRecord(recipe, servings, 1),
  entries: {
    "demo-rice": have(String(100 * servings), "g"),
    "demo-tomato-paste": have("200", "g"),
  },
});
const create = (
  over: Partial<{ servings: number; record: KitchenCheckRecord | null; recipe: Recipe }> = {},
) =>
  createCookingSession({
    id: "s1",
    recipe: over.recipe ?? recipe,
    servings: over.servings ?? 4,
    record: over.record === undefined ? ready(over.servings ?? 4) : over.record,
    ingredientNames: names,
    now: NOW,
  });
const session = (): CookingSession => {
  const r = create();
  if (!r.ok) throw new Error(r.message);
  return r.session;
};
const catalog: Record<string, CatalogEntry> = {
  [recipe.id]: { title: recipe.title, slug: recipe.slug, contentVersion: recipe.contentVersion },
};

describe("createCookingSession", () => {
  it("creates an active session at step 1 with nothing completed", () => {
    const s = session();
    expect(s).toMatchObject({
      id: "s1",
      recipeId: recipe.id,
      recipeSlug: recipe.slug,
      recipeTitle: recipe.title,
      contentVersion: recipe.contentVersion,
      servings: 4,
      status: "active",
      currentStepIndex: 0,
      completedStepIds: [],
      createdAt: NOW,
      updatedAt: NOW,
      pausedAt: null,
      completedAt: null,
      readinessAtStart: "READY",
    });
    expect(s.steps.map((st) => st.id)).toEqual(
      [...recipe.steps].sort((a, b) => a.order - b.order).map((st) => st.id),
    );
  });

  it("captures the selected serving count and its scaled quantities", () => {
    const r = create({ servings: 6 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.session.servings).toBe(6);
      expect(r.session.snapshot.find((l) => l.lineId === "demo-rice")!.scaledQuantity).toBe(600);
    }
  });

  it("is blocked by missing ingredients", () => {
    const record = {
      ...ready(),
      entries: { ...ready().entries, "demo-rice": { have: false, qtyText: "", unit: null } },
    };
    const r = create({ record });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("not-ready");
      if (r.reason === "not-ready") expect(r.readiness.status).toBe("NEEDS_ATTENTION");
    }
  });

  it("is blocked without a Kitchen Check, or with one for other servings", () => {
    expect(create({ record: null }).ok).toBe(false);
    const r = create({ servings: 6, record: ready(4) });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid serving counts instead of clamping", () => {
    for (const servings of [0, -1, 2.5, 99, NaN]) {
      const r = create({ servings });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("invalid-servings");
    }
    expect(validateServings(recipe, 12)).toBe(true);
  });

  it("rejects invalid recipe data", () => {
    const broken = { ...recipe, steps: [] } as unknown as Recipe;
    const r = create({ recipe: broken });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid-recipe");
  });
});

describe("lifecycle", () => {
  it("allows only the documented transitions", () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      active: ["pause", "complete", "abandon", "advance"],
      paused: ["resume", "complete", "abandon"],
      completed: [],
      abandoned: [],
    });
  });

  it("records pause, resume and completion timestamps", () => {
    let s = transitionSession(session(), "pause", NOW + 1);
    expect(s).toMatchObject({ status: "paused", pausedAt: NOW + 1 });
    s = transitionSession(s, "resume", NOW + 2);
    expect(s).toMatchObject({ status: "active", pausedAt: null, updatedAt: NOW + 2 });
    s = transitionSession(s, "complete", NOW + 3);
    expect(s).toMatchObject({ status: "completed", completedAt: NOW + 3 });
  });

  it("never lets a completed or abandoned session become active again", () => {
    const done = transitionSession(session(), "complete", NOW + 1);
    for (const t of ["resume", "pause", "advance", "abandon"] as const) {
      expect(() => transitionSession(done, t, NOW + 2)).toThrow(SessionTransitionError);
    }
    const ended = transitionSession(session(), "abandon", NOW + 1);
    expect(() => transitionSession(ended, "resume", NOW + 2)).toThrow(SessionTransitionError);
  });

  it("doesn't move steps while paused", () => {
    const paused = transitionSession(session(), "pause", NOW + 1);
    expect(() => goToStep(paused, 1, NOW + 2)).toThrow(SessionTransitionError);
    expect(() => completeStep(paused, paused.steps[0].id, NOW + 2)).toThrow();
  });

  it("navigates steps within range only", () => {
    const s = session();
    const last = s.steps.length - 1;
    expect(goToStep(s, last, NOW + 1).currentStepIndex).toBe(last);
    expect(goToStep(goToStep(s, last, NOW + 1), 0, NOW + 2).currentStepIndex).toBe(0);
    expect(() => goToStep(s, last + 1, NOW + 1)).toThrow(/does not exist/);
    expect(() => goToStep(s, -1, NOW + 1)).toThrow();
    expect(() => transitionSession(goToStep(s, last, NOW), "advance", NOW + 1)).toThrow(
      /last step/,
    );
  });

  it("completes steps only when asked, once, and only known steps", () => {
    const s = session();
    const id = s.steps[0].id;
    const once = completeStep(s, id, NOW + 1);
    expect(once.completedStepIds).toEqual([id]);
    expect(completeStep(once, id, NOW + 2)).toBe(once);
    expect(uncompleteStep(once, id, NOW + 3).completedStepIds).toEqual([]);
    expect(() => completeStep(s, "nope", NOW + 1)).toThrow(/not part of this session/);
  });
});

describe("resolveSession", () => {
  it("returns the current step from the session's own snapshot", () => {
    const view = resolveSession(goToStep(session(), 1, NOW), catalog, NOW);
    expect(view.kind).toBe("cooking");
    if (view.kind === "cooking") {
      expect(view.stepIndex).toBe(1);
      expect(view.step.id).toBe(view.session.steps[1].id);
      expect(view.recipeUpdated).toBe(false);
    }
  });

  it("keeps the started instructions when the recipe is republished", () => {
    const s = session();
    const original = s.steps[0].instruction;
    const newer = {
      [recipe.id]: { ...catalog[recipe.id], contentVersion: recipe.contentVersion + 1 },
    };
    const view = resolveSession(s, newer, NOW);
    expect(view.kind).toBe("cooking");
    if (view.kind === "cooking") {
      expect(view.recipeUpdated).toBe(true);
      expect(view.step.instruction).toBe(original);
    }
  });

  it("still works when the recipe has left the catalog", () => {
    const view = resolveSession(session(), {}, NOW);
    expect(view.kind === "cooking" && view.recipeMissing).toBe(true);
  });

  it("repairs an out-of-range step index", () => {
    const view = resolveSession({ ...session(), currentStepIndex: 40 }, catalog, NOW);
    expect(view.kind).toBe("cooking");
    if (view.kind === "cooking") {
      expect(view.stepRepaired).toBe(true);
      expect(view.stepIndex).toBe(view.stepCount - 1);
      expect(view.session.currentStepIndex).toBe(view.stepCount - 1);
    }
  });

  it("reports completed and abandoned sessions instead of reopening them", () => {
    expect(resolveSession(transitionSession(session(), "complete", NOW), catalog, NOW).kind).toBe(
      "completed",
    );
    expect(resolveSession(transitionSession(session(), "abandon", NOW), catalog, NOW).kind).toBe(
      "abandoned",
    );
  });

  it("distinguishes missing, corrupt and pre-snapshot sessions", () => {
    expect(resolveSession(null, catalog, NOW).kind).toBe("not-found");
    expect(resolveSession({ id: "x", status: "active" }, catalog, NOW).kind).toBe("corrupt");
    expect(resolveSession({ ...session(), status: "cooking" }, catalog, NOW).kind).toBe("corrupt");
    expect(
      resolveSession({ ...session(), readinessAtStart: "NOT_CHECKED" }, catalog, NOW).kind,
    ).toBe("corrupt");
    const legacy = { ...session() } as Record<string, unknown>;
    delete legacy.steps;
    expect(resolveSession(legacy, catalog, NOW).kind).toBe("no-snapshot");
  });

  it("recomputes running timers after a refresh", () => {
    const s = session();
    const timer = s.timers[0];
    const running = {
      ...s,
      timers: [{ ...timer, status: "running" as const, endsAt: NOW + 60_000 }],
    };
    const view = resolveSession(JSON.parse(JSON.stringify(running)), catalog, NOW + 20_000);
    expect(view.kind === "cooking" && remainingMs(view.session.timers[0], NOW + 20_000)).toBe(
      40_000,
    );
  });
});

describe("reconcileExisting", () => {
  it("resumes an open session for the same recipe version and servings", () => {
    const open = session();
    expect(reconcileExisting(open, recipe, 4, NOW).resume).toBe(open);
  });

  it("abandons an open session for different servings", () => {
    const { resume, abandon } = reconcileExisting(session(), recipe, 6, NOW + 5);
    expect(resume).toBeNull();
    expect(abandon).toMatchObject({ status: "abandoned", abandonedAt: NOW + 5 });
  });

  it("ignores finished sessions", () => {
    const done = transitionSession(session(), "complete", NOW);
    expect(reconcileExisting(done, recipe, 4, NOW)).toEqual({ resume: null, abandon: null });
  });
});

describe("LocalSessions persistence", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("survives a refresh: a fresh adapter resolves the same session and step", async () => {
    await new LocalSessions().store(goToStep(session(), 2, NOW + 1));
    const raw = await new LocalSessions().getRaw("s1");
    const view = resolveSession(raw, catalog, NOW + 2);
    expect(view.kind === "cooking" && view.stepIndex).toBe(2);
  });

  it("isolates a corrupt entry instead of losing every session", async () => {
    await new LocalSessions().store({ ...session(), id: "good" });
    const arr = JSON.parse(store.get("kooking:sessions:v1")!);
    arr.push({ id: "bad", status: "weird" });
    store.set("kooking:sessions:v1", JSON.stringify(arr));
    const repo = new LocalSessions();
    expect(resolveSession(await repo.getRaw("bad"), catalog, NOW).kind).toBe("corrupt");
    expect((await repo.getById("good")).id).toBe("good");
    expect((await repo.latestResumable())?.id).toBe("good");
  });

  it("keeps every open session when trimming finished history", async () => {
    const repo = new LocalSessions();
    await repo.store({ ...session(), id: "open" });
    for (let i = 0; i < 40; i++) {
      await repo.store(transitionSession({ ...session(), id: `done${i}` }, "complete", NOW + i));
    }
    expect((await repo.getById("open")).status).toBe("active");
    expect(JSON.parse(store.get("kooking:sessions:v1")!)).toHaveLength(31);
  });

  it("an old route to a completed session stays completed after reload", async () => {
    await new LocalSessions().store(transitionSession(session(), "complete", NOW + 1));
    const view = resolveSession(await new LocalSessions().getRaw("s1"), catalog, NOW + 2);
    expect(view.kind).toBe("completed");
  });
});
