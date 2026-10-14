import { describe, expect, it } from "vitest";
import type { RecipeSummary } from "./discovery";
import {
  filterSaved,
  resolveSaved,
  salvageSavedEntries,
  sortSaved,
  withSaved,
  withoutSaved,
} from "./saved";
import { GUEST_OWNER } from "./user";

const e = (recipeId: string, savedAt: number, ownerId = GUEST_OWNER) => ({
  ownerId,
  recipeId,
  savedAt,
});
const summary = (id: string, title: string, categories: string[] = []): RecipeSummary =>
  ({
    id,
    slug: id,
    title,
    totalMinutes: 30,
    servings: 4,
    stepCount: 3,
    categories,
    demo: false,
  }) as RecipeSummary;

describe("salvageSavedEntries", () => {
  it("keeps every valid entry and counts what it dropped", () => {
    const { entries, dropped } = salvageSavedEntries([
      e("a", 1),
      { ownerId: "guest", recipeId: "", savedAt: 2 }, // empty id
      { ownerId: "guest", recipeId: "b" }, // no time
      "garbage",
      null,
      e("c", 3),
    ]);
    expect(entries.map((x) => x.recipeId)).toEqual(["a", "c"]);
    expect(dropped).toBe(4);
  });

  it("collapses duplicates to the most recent save", () => {
    const { entries, dropped } = salvageSavedEntries([e("a", 1), e("a", 5), e("a", 3)]);
    expect(entries).toEqual([e("a", 5)]);
    expect(dropped).toBe(2);
  });

  it("treats a non-list as empty", () => {
    expect(salvageSavedEntries({ a: 1 })).toEqual({ entries: [], dropped: 1 });
    expect(salvageSavedEntries("x")).toEqual({ entries: [], dropped: 1 });
    expect(salvageSavedEntries(null)).toEqual({ entries: [], dropped: 0 });
    expect(salvageSavedEntries(undefined)).toEqual({ entries: [], dropped: 0 });
  });

  it("keeps the same recipe for different owners apart", () => {
    expect(salvageSavedEntries([e("a", 1), e("a", 2, "account-1")]).entries).toHaveLength(2);
  });
});

describe("saving rules", () => {
  it("never creates a duplicate; saving again refreshes the time", () => {
    const once = withSaved([], e("a", 1));
    const twice = withSaved(once, e("a", 9));
    expect(twice).toEqual([e("a", 9)]);
  });

  it("removes only that owner's entry", () => {
    const list = [e("a", 1), e("a", 2, "account-1"), e("b", 3)];
    expect(withoutSaved(list, GUEST_OWNER, "a")).toEqual([e("a", 2, "account-1"), e("b", 3)]);
  });

  it("sorts newest first with a stable tie-break", () => {
    expect(sortSaved([e("b", 1), e("a", 5), e("c", 5)]).map((x) => x.recipeId)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });
});

describe("resolveSaved", () => {
  const catalog = [summary("r1", "Jollof Rice"), summary("r2", "Egusi Soup")];

  it("returns catalog recipes in saved order and reports ones that are gone", () => {
    const r = resolveSaved([e("r1", 1), e("gone", 5), e("r2", 3)], catalog);
    expect(r.available.map((x) => x.id)).toEqual(["r2", "r1"]);
    expect(r.unavailable).toEqual(["gone"]);
  });

  it("titles and details always come from the catalog, never storage", () => {
    expect(resolveSaved([e("r1", 1)], catalog).available[0].title).toBe("Jollof Rice");
  });

  it("handles an empty list and an empty catalog", () => {
    expect(resolveSaved([], catalog)).toEqual({ available: [], unavailable: [] });
    expect(resolveSaved([e("r1", 1)], [])).toEqual({ available: [], unavailable: ["r1"] });
  });
});

describe("filterSaved", () => {
  const list = [
    summary("r1", "Jollof Rice", ["rice"]),
    summary("r2", "Egusi Soup", ["stews-soups"]),
    summary("r3", "Fried Plantain", ["plantain"]),
  ];
  it("matches title and category words, keeping order", () => {
    expect(filterSaved(list, "rice").map((r) => r.id)).toEqual(["r1"]);
    expect(filterSaved(list, "SOUPS").map((r) => r.id)).toEqual(["r2"]);
    expect(filterSaved(list, "fried plantain").map((r) => r.id)).toEqual(["r3"]);
    expect(filterSaved(list, "  ")).toEqual(list);
    expect(filterSaved(list, "chicken")).toEqual([]);
  });
});
