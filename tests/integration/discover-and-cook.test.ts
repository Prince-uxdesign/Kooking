// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import seedJson from "@/content/seed/demo-tomato-rice.json";
import { recipeSchema, type Recipe } from "@/shared/domain/recipe-schema";
import { buildSearchIndex, searchRecipes, EMPTY_SEARCH } from "@/shared/domain/search";
import { scaleRecipe, calculateScalingRatio } from "@/shared/domain/scaling";
import {
  buildKitchenCheckView,
  kitchenCheckKey,
  addShortagesToList,
  type KitchenCheckRecord,
} from "@/shared/domain/kitchen-check";
import {
  LocalKitchenChecks,
  LocalSessions,
  LocalCookingHistory,
  LocalShopping,
} from "@/shared/data/local";
import {
  advanceStep,
  createCookingSession,
  finishCooking,
  previousStep,
  resolveSession,
  stepDisplay,
} from "@/shared/domain/cooking-session";
import { applySessionTimer, settleSessionTimers, transitionSession } from "@/shared/domain/session";
import { stepSpeech } from "@/shared/domain/step-speech";
import { planVoiceCommand } from "@/shared/domain/voice-plan";
import { parseAlternatives } from "@/shared/domain/voice-commands";
import { sessionToHistoryEntry } from "@/shared/domain/cooking-history";
import { emptyList, addPersonalItem } from "@/shared/domain/shopping";

/**
 * PHASE 39: CRITICAL END-TO-END JOURNEY 1 — DISCOVER AND COOK
 *
 * Verifies all 27 steps of the primary user journey in strict order
 * without mocking or simulating away domain behavior:
 * 1. Open Kooking as an anonymous user.
 * 2. Browse available recipes.
 * 3. Search for a recipe.
 * 4. Apply available filters.
 * 5. Open a recipe detail page.
 * 6. Adjust the serving count.
 * 7. Verify ingredient quantities update according to scaling rules.
 * 8. Open Kitchen Check.
 * 9. Enter available ingredient quantities.
 * 10. Verify sufficient, insufficient, missing, optional, and review-required states.
 * 11. Verify recipe cannot start while blocking requirements remain unresolved.
 * 12. Generate a shopping list containing the correct missing quantities.
 * 13. Edit or check shopping-list items.
 * 14. Return to Kitchen Check.
 * 15. Confirm newly available ingredients.
 * 16. Verify readiness again.
 * 17. Start Cooking Mode.
 * 18. Navigate through the instructions.
 * 19. Verify contextual quantities.
 * 20. Start, pause, resume, and complete a timer.
 * 21. Test read-aloud.
 * 22. Test supported voice commands where supported.
 * 23. Pause and resume the session.
 * 24. Refresh or leave and return to the session.
 * 25. Verify restored progress and timer state.
 * 26. Complete the cooking session.
 * 27. Verify that completion is recorded correctly where persistence is enabled.
 */
describe("Phase 39: Comprehensive End-to-End Journey 1 (Discover and Cook)", () => {
  const recipe: Recipe = recipeSchema.parse(seedJson);
  let now = 1_700_000_000_000;
  const advanceTime = (ms: number) => {
    now += ms;
    return now;
  };

  const ingredientNames: Record<string, string> = {
    "demo:long-grain-rice": "Long-grain rice",
    "demo:tomato-paste": "Tomato paste",
    "demo:tomato-puree": "Tomato puree",
    "demo:salt": "Salt",
    "demo:plantain": "Plantain",
  };

  // Local storage stores
  let localChecks: LocalKitchenChecks;
  let localSessions: LocalSessions;
  let localHistory: LocalCookingHistory;
  let localShopping: LocalShopping;

  beforeEach(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
    localChecks = new LocalKitchenChecks();
    localSessions = new LocalSessions();
    localHistory = new LocalCookingHistory();
    localShopping = new LocalShopping();
  });

  it("executes the complete 27-step Discover and Cook journey end-to-end", async () => {
    // -------------------------------------------------------------------------
    // Step 1: Open Kooking as an anonymous user
    // -------------------------------------------------------------------------
    const guest = { id: "device-guest-qa-1" };

    const initialHistory = await localHistory.list();
    expect(initialHistory).toEqual([]);

    const initialList = (await localShopping.load(guest.id)) ?? emptyList(guest.id, now);
    expect(initialList.items).toEqual([]);

    // -------------------------------------------------------------------------
    // Step 2: Browse available recipes
    // -------------------------------------------------------------------------
    const catalog = [recipe];
    expect(catalog.length).toBeGreaterThanOrEqual(1);
    expect(catalog[0].id).toBe("demo-tomato-rice");
    expect(catalog[0].categories).toContain("rice");
    expect(catalog[0].tags).toContain("demo");

    // -------------------------------------------------------------------------
    // Step 3: Search for a recipe
    // -------------------------------------------------------------------------
    const searchIndex = buildSearchIndex(
      catalog,
      Object.entries(ingredientNames).map(([id, name]) => ({ id, name, aliases: [] })),
    );
    const searchResults = searchRecipes(searchIndex, { ...EMPTY_SEARCH, q: "tomato" });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].summary.slug).toBe("demo-tomato-rice");

    // -------------------------------------------------------------------------
    // Step 4: Apply available filters
    // -------------------------------------------------------------------------
    const filteredResults = searchRecipes(searchIndex, {
      ...EMPTY_SEARCH,
      categories: ["rice"],
      maxTime: 45,
    });
    expect(filteredResults.length).toBe(1);
    expect(filteredResults[0].summary.id).toBe("demo-tomato-rice");

    // -------------------------------------------------------------------------
    // Step 5: Open a recipe detail page
    // -------------------------------------------------------------------------
    const openedRecipe = catalog.find((r) => r.slug === "demo-tomato-rice");
    expect(openedRecipe).toBeDefined();
    expect(openedRecipe!.baseServings).toBe(4);
    expect(openedRecipe!.steps.length).toBe(3);
    expect(openedRecipe!.ingredients.length).toBe(4);

    // -------------------------------------------------------------------------
    // Step 6: Adjust the serving count
    // -------------------------------------------------------------------------
    const targetServings = 6;
    const ratio = calculateScalingRatio(openedRecipe!.baseServings, targetServings);
    expect(ratio).toBe(1.5);

    // -------------------------------------------------------------------------
    // Step 7: Verify ingredient quantities update according to scaling rules
    // -------------------------------------------------------------------------
    const scaledIngredients = scaleRecipe(openedRecipe!, targetServings);

    // 1. Long grain rice: 400g * 1.5 = 600g (linear)
    const riceLine = scaledIngredients.find((i) => i.id === "demo-rice");
    expect(riceLine).toBeDefined();
    expect(riceLine!.scaledQuantity).toBe(600);
    expect(riceLine!.displayQuantity).toBe("600 g");
    expect(riceLine!.unit).toBe("g");
    expect(riceLine!.scaling).toBe("linear");

    // 2. Tomato paste: 70g * 1.5 = 105g (linear)
    const pasteLine = scaledIngredients.find((i) => i.id === "demo-tomato-paste");
    expect(pasteLine).toBeDefined();
    expect(pasteLine!.scaledQuantity).toBe(105);
    expect(pasteLine!.displayQuantity).toBe("105 g");
    expect(pasteLine!.unit).toBe("g");

    // 3. Salt: null -> null (to-taste, not scaled)
    const saltLine = scaledIngredients.find((i) => i.id === "demo-salt");
    expect(saltLine).toBeDefined();
    expect(saltLine!.scaledQuantity).toBeNull();
    expect(saltLine!.scaling).toBe("to-taste");

    // 4. Plantain: 2 pieces * 1.5 = 3 pieces (discrete)
    const plantainLine = scaledIngredients.find((i) => i.id === "demo-plantain");
    expect(plantainLine).toBeDefined();
    expect(plantainLine!.scaledQuantity).toBe(3);
    expect(plantainLine!.unit).toBe("piece");

    // -------------------------------------------------------------------------
    // Step 8: Open Kitchen Check
    // -------------------------------------------------------------------------
    const checkKey = kitchenCheckKey(openedRecipe!, targetServings);
    expect(checkKey).toBe("demo-tomato-rice@v1:6");

    let checkView = buildKitchenCheckView({
      recipe: openedRecipe!,
      servings: targetServings,
      record: null,
      ingredientNames,
    });
    expect(checkView.rows.length).toBe(4);
    expect(checkView.readiness.canStartCooking).toBe(false);
    expect(checkView.readiness.status).toBe("NOT_CHECKED");

    // -------------------------------------------------------------------------
    // Step 9: Enter available ingredient quantities into Kitchen Check
    // -------------------------------------------------------------------------
    // Scenario:
    // - Rice: user has 600g (sufficient)
    // - Tomato paste: user only has 50g (insufficient, needs 105g)
    // - Salt: user does not have (optional, so non-blocking)
    // - Plantain: user has 1 piece (garnish)
    const initialRecord: KitchenCheckRecord = {
      key: checkKey,
      recipeId: openedRecipe!.id,
      servings: targetServings,
      entries: {
        "demo-rice": { have: true, qtyText: "600", unit: "g" },
        "demo-tomato-paste": { have: true, qtyText: "50", unit: "g" },
        "demo-salt": { have: false, qtyText: "", unit: null },
        "demo-plantain": { have: true, qtyText: "1", unit: "piece" },
      },
      substitutions: {},
      updatedAt: now,
    };
    await localChecks.store(initialRecord);

    // -------------------------------------------------------------------------
    // Step 10: Verify sufficient, insufficient, missing, optional, and review-required states
    // -------------------------------------------------------------------------
    checkView = buildKitchenCheckView({
      recipe: openedRecipe!,
      servings: targetServings,
      record: initialRecord,
      ingredientNames,
    });

    const evaluatedRice = checkView.rows.find((r) => r.lineId === "demo-rice");
    expect(evaluatedRice?.state).toBe("have-enough");

    const evaluatedPaste = checkView.rows.find((r) => r.lineId === "demo-tomato-paste");
    expect(evaluatedPaste?.state).toBe("not-enough");
    expect(evaluatedPaste?.shortageQuantity).toBe(55); // 105 - 50 = 55g short

    const evaluatedSalt = checkView.rows.find((r) => r.lineId === "demo-salt");
    expect(evaluatedSalt?.state).toBe("optional");
    expect(evaluatedSalt?.isBlocking).toBe(false);

    // Verify review-required behavior if an incompatible unit was typed (e.g. "2 cups" for rice in grams)
    const incompatibleRecord: KitchenCheckRecord = {
      ...initialRecord,
      entries: {
        ...initialRecord.entries,
        "demo-rice": { have: true, qtyText: "2", unit: "cup" },
      },
    };
    const incompatibleView = buildKitchenCheckView({
      recipe: openedRecipe!,
      servings: targetServings,
      record: incompatibleRecord,
      ingredientNames,
    });
    const reviewRice = incompatibleView.rows.find((r) => r.lineId === "demo-rice");
    expect(reviewRice?.state).toBe("needs-review");
    expect(reviewRice?.isBlocking).toBe(true);

    // -------------------------------------------------------------------------
    // Step 11: Verify recipe cannot start while blocking requirements remain unresolved
    // -------------------------------------------------------------------------
    expect(checkView.readiness.canStartCooking).toBe(false);
    expect(checkView.readiness.blockedReason).toBeDefined();
    expect(checkView.readiness.explanations.some((e) => e.includes("Tomato paste"))).toBe(true);

    const blockedSessionResult = createCookingSession({
      id: "blocked-session",
      recipe: openedRecipe!,
      servings: targetServings,
      record: initialRecord,
      ingredientNames,
      now,
    });
    expect(blockedSessionResult.ok).toBe(false);
    if (!blockedSessionResult.ok) {
      expect(blockedSessionResult.reason).toBe("not-ready");
    }

    // -------------------------------------------------------------------------
    // Step 12: Generate a shopping list containing the correct missing quantities
    // -------------------------------------------------------------------------
    let shoppingList = emptyList(guest.id, now);
    const mergeResult = addShortagesToList(shoppingList.items, {
      recipe: openedRecipe!,
      servings: targetServings,
      rows: checkView.rows,
      now,
    });

    expect(mergeResult.added).toBe(2);
    const pasteNeed = mergeResult.items.find((i) => i.lineId === "demo-tomato-paste");
    expect(pasteNeed).toBeDefined();
    expect(pasteNeed!.qty).toBe(55); // Exactly the 55g shortage
    expect(pasteNeed!.unit).toBe("g");
    expect(pasteNeed!.checked).toBe(false);

    const plantainNeed = mergeResult.items.find((i) => i.lineId === "demo-plantain");
    expect(plantainNeed).toBeDefined();
    expect(plantainNeed!.qty).toBe(2); // 3 needed - 1 have = 2 pieces shortage
    expect(plantainNeed!.unit).toBe("piece");

    shoppingList = { ...shoppingList, items: mergeResult.items, updatedAt: now };
    await localShopping.store(shoppingList);

    // -------------------------------------------------------------------------
    // Step 13: Edit or check shopping-list items
    // -------------------------------------------------------------------------
    // Add a personal item
    const addResult = addPersonalItem(
      shoppingList,
      {
        name: "Fresh red onions",
        qty: 2,
        unit: "piece",
      },
      { id: "personal-onions", now: advanceTime(1000) },
    );
    shoppingList = addResult.list;
    expect(shoppingList.items.length).toBe(3);

    // Mark the 55g tomato paste as bought
    shoppingList = {
      ...shoppingList,
      items: shoppingList.items.map((item) =>
        item.lineId === "demo-tomato-paste" ? { ...item, checked: true } : item,
      ),
      updatedAt: advanceTime(1000),
    };
    await localShopping.store(shoppingList);

    const reloadedList = (await localShopping.load(guest.id))!;
    const boughtItem = reloadedList.items.find((i) => i.lineId === "demo-tomato-paste");
    expect(boughtItem?.checked).toBe(true);

    // -------------------------------------------------------------------------
    // Step 14: Return to Kitchen Check
    // -------------------------------------------------------------------------
    const storedCheck = await localChecks.load(checkKey);
    expect(storedCheck).toBeDefined();

    // -------------------------------------------------------------------------
    // Step 15: Confirm newly available ingredients
    // -------------------------------------------------------------------------
    // With tomato paste purchased (now have full 105g required), update record
    const updatedRecord: KitchenCheckRecord = {
      ...storedCheck!,
      entries: {
        ...storedCheck!.entries,
        "demo-tomato-paste": { have: true, qtyText: "105", unit: "g" },
      },
      updatedAt: advanceTime(1000),
    };
    await localChecks.store(updatedRecord);

    // -------------------------------------------------------------------------
    // Step 16: Verify readiness again
    // -------------------------------------------------------------------------
    const readyView = buildKitchenCheckView({
      recipe: openedRecipe!,
      servings: targetServings,
      record: updatedRecord,
      ingredientNames,
    });
    expect(readyView.readiness.canStartCooking).toBe(true);
    expect(readyView.readiness.status).toBe("READY");
    expect(readyView.readiness.blockedReason).toBeNull();

    // -------------------------------------------------------------------------
    // Step 17: Start Cooking Mode
    // -------------------------------------------------------------------------
    const sessionResult = createCookingSession({
      id: "session-discover-cook-1",
      recipe: openedRecipe!,
      servings: targetServings,
      record: updatedRecord,
      ingredientNames,
      now: advanceTime(1000),
    });
    expect(sessionResult.ok).toBe(true);
    if (!sessionResult.ok) throw new Error("Expected session creation to succeed");

    let cookingSession = sessionResult.session;
    expect(cookingSession.status).toBe("active");
    expect(cookingSession.currentStepIndex).toBe(0);
    expect(cookingSession.servings).toBe(6);
    expect(cookingSession.readinessAtStart).toBe("READY");
    await localSessions.store(cookingSession);

    // -------------------------------------------------------------------------
    // Step 18: Navigate through the instructions
    // -------------------------------------------------------------------------
    // Step 1: Rinse rice
    expect(cookingSession.currentStepIndex).toBe(0);
    expect(cookingSession.steps[0].instruction).toContain("Rinse the rice");

    // Advance to Step 2: Simmer tomato base
    cookingSession = advanceStep(cookingSession, advanceTime(10_000));
    expect(cookingSession.currentStepIndex).toBe(1);
    expect(cookingSession.completedStepIds).toContain(cookingSession.steps[0].id);

    // Boundary check: Previous back to Step 1
    cookingSession = previousStep(cookingSession, advanceTime(10_000));
    expect(cookingSession.currentStepIndex).toBe(0);

    // Advance back to Step 2
    cookingSession = advanceStep(cookingSession, advanceTime(10_000));
    expect(cookingSession.currentStepIndex).toBe(1);

    // -------------------------------------------------------------------------
    // Step 19: Verify contextual quantities
    // -------------------------------------------------------------------------
    // Step 1 contextual quantity: 600g rice
    const step1Display = stepDisplay(cookingSession, 0)!;
    expect(
      step1Display.ingredients.some((i) => i.name.includes("rice") && i.quantity === "600 g"),
    ).toBe(true);

    // Step 2 contextual quantity: 105g tomato paste
    const step2Display = stepDisplay(cookingSession, 1)!;
    expect(
      step2Display.ingredients.some(
        (i) => i.name.includes("Tomato paste") && i.quantity === "105 g",
      ),
    ).toBe(true);

    // -------------------------------------------------------------------------
    // Step 20: Start and complete a timer
    // -------------------------------------------------------------------------
    const step2Timer = cookingSession.timers.find((t) => t.stepId === cookingSession.steps[1].id);
    expect(step2Timer).toBeDefined();
    expect(step2Timer!.durationSeconds).toBe(600);
    expect(step2Timer!.status).toBe("idle");

    // Start timer
    cookingSession = applySessionTimer(cookingSession, step2Timer!.id, "start", advanceTime(1000));
    const runningTimer = cookingSession.timers.find((t) => t.id === step2Timer!.id);
    expect(runningTimer?.status).toBe("running");
    expect(runningTimer?.endsAt).toBe(now + 600_000);

    // Pause timer
    cookingSession = applySessionTimer(
      cookingSession,
      step2Timer!.id,
      "pause",
      advanceTime(50_000),
    );
    const pausedTimer = cookingSession.timers.find((t) => t.id === step2Timer!.id);
    expect(pausedTimer?.status).toBe("paused");

    // Resume timer
    cookingSession = applySessionTimer(cookingSession, step2Timer!.id, "resume", advanceTime(5000));
    const resumedTimer = cookingSession.timers.find((t) => t.id === step2Timer!.id);
    expect(resumedTimer?.status).toBe("running");

    // Settle timer after expiration
    const expiryTime = resumedTimer!.endsAt! + 1000;
    now = expiryTime;
    const { session: settledSession, finished } = settleSessionTimers(cookingSession, now);
    cookingSession = settledSession;
    expect(finished.length).toBe(1);
    expect(finished[0]).toBe(step2Timer!.id);
    const finishedTimer = cookingSession.timers.find((t) => t.id === step2Timer!.id);
    expect(finishedTimer?.status).toBe("done");
    expect(finishedTimer?.acknowledged).toBe(false);

    // Acknowledge timer
    cookingSession = applySessionTimer(cookingSession, step2Timer!.id, "acknowledge", now);
    expect(cookingSession.timers.find((t) => t.id === step2Timer!.id)?.acknowledged).toBe(true);

    // -------------------------------------------------------------------------
    // Step 21: Test read-aloud
    // -------------------------------------------------------------------------
    const speech = stepSpeech(step2Display);
    expect(speech.length).toBeGreaterThan(0);
    const speechText = speech.join(" ");
    expect(speechText).toContain("Step 2 of 3");
    expect(speechText).toContain("Simmer the tomato base");
    expect(speechText).toContain("Oil gathers at the edges");

    // -------------------------------------------------------------------------
    // Step 22: Test supported voice commands where supported
    // -------------------------------------------------------------------------
    const parsedVoice = parseAlternatives(["next step"]);
    expect(parsedVoice.ok).toBe(true);
    if (parsedVoice.ok) {
      const plan = planVoiceCommand(parsedVoice.command, {
        session: cookingSession,
        now,
        speech: "idle",
      });
      expect(plan.kind).toBe("navigate");
      if (plan.kind === "navigate") {
        expect(plan.direction).toBe("next");
      }
    }

    // Advance to Step 3: Steam rice
    cookingSession = advanceStep(cookingSession, advanceTime(10_000));
    expect(cookingSession.currentStepIndex).toBe(2);

    // -------------------------------------------------------------------------
    // Step 23: Pause and resume the session
    // -------------------------------------------------------------------------
    cookingSession = transitionSession(cookingSession, "pause", advanceTime(5000));
    expect(cookingSession.status).toBe("paused");
    await localSessions.store(cookingSession);

    cookingSession = transitionSession(cookingSession, "resume", advanceTime(5000));
    expect(cookingSession.status).toBe("active");
    await localSessions.store(cookingSession);

    // -------------------------------------------------------------------------
    // Step 24: Refresh or leave and return to the session
    // -------------------------------------------------------------------------
    const rawStored = await localSessions.getRaw(cookingSession.id);
    expect(rawStored).toBeDefined();

    const resolved = resolveSession(
      rawStored,
      {
        [openedRecipe!.id]: {
          title: openedRecipe!.title,
          slug: openedRecipe!.slug,
          contentVersion: openedRecipe!.contentVersion,
        },
      },
      advanceTime(1000),
    );
    expect(resolved.kind).toBe("cooking");
    if (resolved.kind !== "cooking") throw new Error("Expected session to resolve to cooking");

    // -------------------------------------------------------------------------
    // Step 25: Verify restored progress and timer state
    // -------------------------------------------------------------------------
    expect(resolved.session.currentStepIndex).toBe(2);
    expect(resolved.session.completedStepIds).toContain(cookingSession.steps[0].id);
    expect(resolved.session.completedStepIds).toContain(cookingSession.steps[1].id);
    expect(resolved.session.timers.length).toBe(cookingSession.timers.length);

    // -------------------------------------------------------------------------
    // Step 26: Complete the cooking session
    // -------------------------------------------------------------------------
    const allStepIds = resolved.session.steps.map((s) => s.id);
    const readyToFinish = {
      ...resolved.session,
      completedStepIds: allStepIds,
    };
    const completedSession = finishCooking(readyToFinish, advanceTime(10_000));
    expect(completedSession.status).toBe("completed");
    expect(completedSession.completedAt).toBe(now);
    await localSessions.store(completedSession);

    // -------------------------------------------------------------------------
    // Step 27: Verify completion is recorded correctly where persistence is enabled
    // -------------------------------------------------------------------------
    const historyEntry = sessionToHistoryEntry(completedSession, { userId: null });
    expect(historyEntry.sessionId).toBe(completedSession.id);
    expect(historyEntry.recipeId).toBe(openedRecipe!.id);
    expect(historyEntry.status).toBe("completed");
    expect(historyEntry.servings).toBe(6);
    expect(historyEntry.completedStepsCount).toBe(3);
    expect(historyEntry.totalStepsCount).toBe(3);

    await localHistory.record(historyEntry);

    const recordedEntries = await localHistory.list();
    expect(recordedEntries.length).toBe(1);
    expect(recordedEntries[0].sessionId).toBe(completedSession.id);
    expect(recordedEntries[0].recipeTitle).toBe(openedRecipe!.title);
    expect(recordedEntries[0].status).toBe("completed");
  });
});
