import { describe, expect, it } from "vitest";
import {
  cookingHistoryEntrySchema,
  mergeCookingHistory,
  sessionToHistoryEntry,
  type CookingHistoryEntry,
} from "./cooking-history";
import type { CookingSession } from "./session";

const MOCK_SESSION: CookingSession = {
  id: "session_123",
  recipeId: "jollof-rice",
  recipeSlug: "jollof-rice",
  recipeTitle: "Classic Nigerian Jollof Rice",
  contentVersion: 2,
  servings: 4,
  currentStepIndex: 3,
  completedStepIds: ["step_1", "step_2", "step_3"],
  timers: [],
  snapshot: [],
  steps: [
    { id: "step_1", order: 1, instruction: "Blend peppers", ingredientIds: [] },
    { id: "step_2", order: 2, instruction: "Parboil rice", ingredientIds: [] },
    { id: "step_3", order: 3, instruction: "Fry base", ingredientIds: [] },
    { id: "step_4", order: 4, instruction: "Cook rice", ingredientIds: [] },
  ],
  status: "completed",
  createdAt: 100_000,
  updatedAt: 160_000,
  completedAt: 160_000,
  pausedAt: null,
  abandonedAt: null,
};

describe("cooking-history domain", () => {
  it("validates a complete history entry schema", () => {
    const entry: CookingHistoryEntry = {
      id: "history:1",
      sessionId: "sess_1",
      userId: "user_abc",
      recipeId: "egusi-soup",
      recipeTitle: "Egusi Soup",
      recipeSlug: "egusi-soup",
      contentVersion: 1,
      servings: 6,
      status: "completed",
      startedAt: 100_000,
      completedAt: 145_000,
      durationMinutes: 45,
      completedStepsCount: 5,
      totalStepsCount: 5,
      createdAt: 145_000,
    };

    const parsed = cookingHistoryEntrySchema.safeParse(entry);
    expect(parsed.success).toBe(true);
  });

  describe("sessionToHistoryEntry", () => {
    it("creates a completed history entry from a completed session", () => {
      const entry = sessionToHistoryEntry(MOCK_SESSION);

      expect(entry.status).toBe("completed");
      expect(entry.sessionId).toBe("session_123");
      expect(entry.recipeTitle).toBe("Classic Nigerian Jollof Rice");
      expect(entry.recipeSlug).toBe("jollof-rice");
      expect(entry.servings).toBe(4);
      expect(entry.contentVersion).toBe(2);
      expect(entry.startedAt).toBe(100_000);
      expect(entry.completedAt).toBe(160_000);
      expect(entry.durationMinutes).toBe(1); // 60s is 1 min
      expect(entry.completedStepsCount).toBe(3);
      expect(entry.totalStepsCount).toBe(4);
    });

    it("creates an abandoned history entry from an abandoned session", () => {
      const abandonedSession: CookingSession = {
        ...MOCK_SESSION,
        status: "abandoned",
        completedAt: null,
        abandonedAt: 130_000,
      };

      const entry = sessionToHistoryEntry(abandonedSession);

      expect(entry.status).toBe("abandoned");
      expect(entry.completedAt).toBe(130_000);
      expect(entry.durationMinutes).toBe(1);
    });

    it("classifies an active session ended prematurely as interrupted, never completed", () => {
      const activeSession: CookingSession = {
        ...MOCK_SESSION,
        status: "active",
        completedAt: null,
        abandonedAt: null,
      };

      const entry = sessionToHistoryEntry(activeSession, { now: 150_000 });

      expect(entry.status).toBe("interrupted");
      expect(entry.status).not.toBe("completed");
      expect(entry.completedAt).toBeNull();
    });

    it("supports explicit status override", () => {
      const entry = sessionToHistoryEntry(MOCK_SESSION, {
        statusOverride: "interrupted",
      });

      expect(entry.status).toBe("interrupted");
    });
  });

  describe("mergeCookingHistory", () => {
    it("deduplicates by sessionId and sorts newest startedAt first", () => {
      const entry1: CookingHistoryEntry = {
        id: "h1",
        sessionId: "sess_1",
        recipeId: "r1",
        recipeTitle: "Jollof",
        recipeSlug: "jollof",
        contentVersion: 1,
        servings: 4,
        status: "completed",
        startedAt: 100_000,
        completedAt: 130_000,
        durationMinutes: 30,
        completedStepsCount: 4,
        totalStepsCount: 4,
        createdAt: 130_000,
      };

      const entry2: CookingHistoryEntry = {
        id: "h2",
        sessionId: "sess_2",
        recipeId: "r2",
        recipeTitle: "Suya",
        recipeSlug: "suya",
        contentVersion: 1,
        servings: 2,
        status: "completed",
        startedAt: 200_000,
        completedAt: 220_000,
        durationMinutes: 20,
        completedStepsCount: 2,
        totalStepsCount: 2,
        createdAt: 220_000,
      };

      const duplicateSess1: CookingHistoryEntry = {
        ...entry1,
        id: "h1_duplicate",
        status: "interrupted", // older/interrupted version
      };

      const merged = mergeCookingHistory([entry1], [entry2, duplicateSess1]);

      expect(merged).toHaveLength(2);
      expect(merged[0].sessionId).toBe("sess_2"); // 200_000 > 100_000
      expect(merged[1].sessionId).toBe("sess_1");
      // Completed takes priority over interrupted
      expect(merged[1].status).toBe("completed");
    });
  });
});
