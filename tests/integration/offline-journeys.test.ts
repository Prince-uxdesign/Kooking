// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import seedJson from "@/content/seed/demo-tomato-rice.json";
import { recipeSchema } from "@/shared/domain/recipe-schema";
import {
  LocalRecipeCache,
  LocalSessions,
  LocalShopping,
  LocalCookingHistory,
} from "@/shared/data/local";
import { startSession, transitionSession, type CookingSession } from "@/shared/domain/session";
import { finishCooking } from "@/shared/domain/cooking-session";
import { sessionToHistoryEntry } from "@/shared/domain/cooking-history";
import { emptyList, addPersonalItem, setItemChecked, updateItem } from "@/shared/domain/shopping";
import { mergeShoppingLists } from "@/shared/domain/shopping-sync";
import { remainingMs, applyTimerAction } from "@/shared/domain/timers";
import { checkReachability } from "@/features/pwa/connectivity";
import { applyServiceWorkerUpdate } from "@/features/pwa/pwa-register";

describe("Phase 39 QA: PWA & Offline Resilience End-to-End", () => {
  const recipe = recipeSchema.parse(seedJson);

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("1. Pre-caches recipe and navigates through instructions without network", async () => {
    const cache = new LocalRecipeCache();
    const cacheTimestamp = Date.now();
    await cache.save(recipe, cacheTimestamp);

    // Simulate losing network connectivity
    vi.stubGlobal("navigator", { onLine: false });

    // Verify reachability detects offline without making fetch calls
    const fetchSpy = vi.spyOn(global, "fetch");
    const reachable = await checkReachability();
    expect(reachable).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();

    // Verify recipe can be retrieved from local cache
    const cachedEntry = await cache.get(recipe.id);
    expect(cachedEntry).not.toBeNull();
    expect(cachedEntry?.recipe.title).toBe(recipe.title);
    expect(cachedEntry?.recipe.steps.length).toBe(recipe.steps.length);

    // Verify all steps are fully accessible offline
    cachedEntry?.recipe.steps.forEach((step, idx) => {
      expect(step.instruction).toBe(recipe.steps[idx].instruction);
      expect(step.order).toBe(recipe.steps[idx].order);
    });
  });

  it("2. Operates active cooking session and timers while offline without clock drift", async () => {
    const sessions = new LocalSessions();
    const t0 = 1700000000000;

    // Start cooking session
    let session: CookingSession = startSession({
      id: "offline-cook-session-1",
      recipe,
      servings: 4,
      now: t0,
      lineNames: new Map(),
    });
    await sessions.store(session);

    // Simulate going offline
    vi.stubGlobal("navigator", { onLine: false });

    // Step navigation offline
    session = transitionSession(session, "advance", t0 + 5000);
    expect(session.currentStepIndex).toBe(1);
    await sessions.store(session);

    // Start the step's timer offline
    expect(session.timers.length).toBeGreaterThan(0);
    const runningTimer = applyTimerAction(session.timers[0], "start", t0 + 10000);
    session.timers = [runningTimer, ...session.timers.slice(1)];
    await sessions.store(session);

    // Simulate page refresh / suspension offline
    const recoveredSession = await sessions.getById("offline-cook-session-1");
    expect(recoveredSession).not.toBeNull();
    expect(recoveredSession.currentStepIndex).toBe(1);
    expect(recoveredSession.timers[0].status).toBe("running");

    // Verify timer computes exact remaining time based on timestamp without drift
    const timeMidway = t0 + 10000 + 60000; // 1 min later
    const remaining = remainingMs(recoveredSession.timers[0], timeMidway);
    expect(Math.round(remaining / 1000)).toBe(recoveredSession.timers[0].durationSeconds - 60);

    // Complete session offline
    const tEnd = t0 + 200000;
    const completed = finishCooking(
      {
        ...recoveredSession,
        completedStepIds: recipe.steps.map((s) => s.id),
      },
      tEnd,
      { stopTimers: true },
    );
    expect(completed.status).toBe("completed");

    // History is persisted locally
    const history = new LocalCookingHistory();
    const entry = sessionToHistoryEntry(completed, { now: tEnd });
    await history.record(entry);

    const entries = await history.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].status).toBe("completed");
  });

  it("3. Offline shopping list edits persist and synchronize cleanly when reconnected", async () => {
    const shopping = new LocalShopping();
    const t0 = 1700000000000;
    let list = emptyList("user_offline", t0);

    // Add item offline
    const added = addPersonalItem(
      list,
      { name: "Ground Nutmeg", qty: 1, unit: "tsp" },
      { id: "nutmeg_1", now: t0 + 1000 },
    );
    list = added.list;

    // Check item offline
    list = setItemChecked(list, "nutmeg_1", true, t0 + 2000);

    // Update item offline
    list = updateItem(list, "nutmeg_1", { name: "Ground Nutmeg", qty: 2, unit: "tsp" }, t0 + 3000);
    await shopping.store(list);

    // Verify stored on device
    const stored = await shopping.load("user_offline");
    expect(stored?.items[0].qty).toBe(2);
    expect(stored?.items[0].checked).toBe(true);

    // Simulate Reconnection & Merging with remote changes
    // Suppose remote had another item added meanwhile
    const remoteList = emptyList("user_offline", t0 + 4000);
    remoteList.items = [
      {
        id: "curry_remote",
        name: "Curry Leaves",
        qty: 1,
        unit: "bunch",
        checked: false,
        needsClarification: false,
        origin: "personal",
        createdAt: t0 + 500,
        updatedAt: t0 + 500,
      },
    ];

    const { mergedList } = mergeShoppingLists(stored!, remoteList);
    expect(mergedList.items).toHaveLength(2);
    expect(mergedList.items.map((i) => i.name).sort()).toEqual(["Curry Leaves", "Ground Nutmeg"]);
  });

  it("4. Gracefully handles un-cached resources when offline", async () => {
    const cache = new LocalRecipeCache();

    // Query a recipe that was never cached
    const missing = await cache.get("non-existent-recipe-id");
    expect(missing).toBeNull();

    const missingSlug = await cache.getBySlug("non-existent-slug");
    expect(missingSlug).toBeNull();
  });

  it("5. Service worker updates trigger SKIP_WAITING cleanly", () => {
    const postMessageMock = vi.fn();
    const mockWaiting = {
      postMessage: postMessageMock,
    } as unknown as ServiceWorker;

    const mockReg = {
      waiting: mockWaiting,
    } as unknown as ServiceWorkerRegistration;

    applyServiceWorkerUpdate(mockReg);
    expect(postMessageMock).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
  });
});
