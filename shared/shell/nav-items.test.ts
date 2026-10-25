import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavActive } from "./nav-items";

describe("NAV_ITEMS", () => {
  it("defines the five primary destinations exactly once", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual(["/app", "/recipes", "/saved", "/lists", "/profile"]);
  });

  it("gives every tab a compact label that fits 320px", () => {
    for (const item of NAV_ITEMS) {
      expect(item.shortLabel.length).toBeLessThanOrEqual(8);
    }
  });
});

describe("isNavActive", () => {
  it.each([
    ["/app", "/app", true],
    ["/recipes", "/app", false],
    ["/recipes", "/recipes", true],
    ["/recipes/jollof-rice", "/recipes", true],
    ["/recipesx", "/recipes", false],
    ["/lists", "/lists", true],
    ["/cook/demo", "/lists", false],
    ["/saved", "/saved", true],
    ["/profile", "/profile", true],
    ["/profile/x", "/profile", true],
    ["/app", "/saved", false],
  ])("pathname %s vs %s -> %s", (pathname, href, want) => {
    expect(isNavActive(pathname as string, href as string)).toBe(want);
  });
});
