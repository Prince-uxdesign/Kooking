// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import React from "react";
import { LocalCookingHistory, LocalPreferences } from "@/shared/data/local";
import { MemorySyncAdapter, setRemoteSyncService } from "@/shared/data/remote-sync";
import { axeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { CookingHistorySection } from "./CookingHistorySection";
import { CookingPreferencesSection } from "./CookingPreferencesSection";

let mounted: Mounted | null = null;
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

describe("CookingHistorySection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setRemoteSyncService(new MemorySyncAdapter());
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.unmount();
      mounted = null;
    }
  });

  it("renders empty state when there are no cooking sessions", async () => {
    mounted = await mount(<CookingHistorySection userId={null} isAuthenticated={false} />);
    await settle();

    const text = mounted.container.textContent ?? "";
    expect(text).toContain("Cooking History");
    expect(text).toContain("No cooking history yet");
    expect(text).toContain("Find a recipe to cook");

    const violations = await axeViolations(mounted.container);
    expect(violations).toHaveLength(0);
  });

  it("renders completed, ended early, and interrupted sessions with distinct badges", async () => {
    const history = new LocalCookingHistory();
    await history.record({
      id: "h1",
      sessionId: "s1",
      recipeId: "jollof",
      recipeTitle: "Jollof Rice",
      recipeSlug: "jollof",
      contentVersion: 1,
      servings: 4,
      status: "completed",
      startedAt: 1000,
      completedAt: 3000,
      durationMinutes: 33,
      completedStepsCount: 8,
      totalStepsCount: 8,
      createdAt: 3000,
    });

    await history.record({
      id: "h2",
      sessionId: "s2",
      recipeId: "suya",
      recipeTitle: "Beef Suya",
      recipeSlug: "suya",
      contentVersion: 1,
      servings: 2,
      status: "abandoned",
      startedAt: 4000,
      completedAt: 4500,
      durationMinutes: 8,
      completedStepsCount: 2,
      totalStepsCount: 6,
      createdAt: 4500,
    });

    await history.record({
      id: "h3",
      sessionId: "s3",
      recipeId: "chin-chin",
      recipeTitle: "Chin Chin",
      recipeSlug: "chin-chin",
      contentVersion: 1,
      servings: 6,
      status: "interrupted",
      startedAt: 6000,
      completedAt: null,
      durationMinutes: null,
      completedStepsCount: 1,
      totalStepsCount: 4,
      createdAt: 6000,
    });

    mounted = await mount(<CookingHistorySection userId={null} isAuthenticated={false} />);
    await settle();

    const text = mounted.container.textContent ?? "";
    expect(text).toContain("Jollof Rice");
    expect(text).toContain("Completed");
    expect(text).toContain("33 min");
    expect(text).toContain("8 of 8 steps");

    expect(text).toContain("Beef Suya");
    expect(text).toContain("Ended early");
    expect(text).toContain("2 of 6 steps");

    expect(text).toContain("Chin Chin");
    expect(text).toContain("Interrupted");
    expect(text).toContain("1 of 4 steps");

    const violations = await axeViolations(mounted.container);
    expect(violations).toHaveLength(0);
  });
});

describe("CookingPreferencesSection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setRemoteSyncService(new MemorySyncAdapter());
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.unmount();
      mounted = null;
    }
  });

  it("renders preference controls and updates servings", async () => {
    mounted = await mount(<CookingPreferencesSection userId={null} isAuthenticated={false} />);
    await settle();

    const text = mounted.container.textContent ?? "";
    expect(text).toContain("Cooking Preferences");
    expect(text).toContain("Default portion size");
    expect(text).toContain("Keep screen awake");
    expect(text).toContain("Timer audio chime");
    expect(text).toContain("Step read-aloud");

    // Stepper starts at 4
    expect(text).toContain("4");

    // Click Increase servings (+)
    const plusBtn = mounted.container.querySelector(
      'button[aria-label="Increase default servings"]',
    ) as HTMLButtonElement;
    expect(plusBtn).not.toBeNull();

    await act(async () => {
      plusBtn.click();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mounted.container.textContent).toContain("5");

    // Verify persisted in localStorage
    const store = new LocalPreferences();
    const saved = await store.load();
    expect(saved.defaultServings).toBe(5);

    const violations = await axeViolations(mounted.container);
    expect(violations).toHaveLength(0);
  });

  it("toggles checkboxes and updates local settings", async () => {
    mounted = await mount(<CookingPreferencesSection userId={null} isAuthenticated={false} />);
    await settle();

    const screenWakeCheckbox = mounted.container.querySelector(
      "#pref-screen-wake",
    ) as HTMLInputElement;
    expect(screenWakeCheckbox.checked).toBe(true);

    await act(async () => {
      screenWakeCheckbox.click();
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(screenWakeCheckbox.checked).toBe(false);

    const store = new LocalPreferences();
    const saved = await store.load();
    expect(saved.screenWake).toBe(false);
  });
});
