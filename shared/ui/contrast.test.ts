import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG 2.2 contrast for the token pairs the app actually uses. Computed
 * from `app/globals.css`, so a changed token that breaks a pair fails here.
 * Text needs 4.5:1; non-text indicators (focus rings, control boundaries) 3:1.
 */
const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const token = (name: string): string => {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(css);
  if (!m) throw new Error(`missing token ${name}`);
  return m[1];
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `fg` at `alpha` painted over `bg`. */
const over = (fg: string, bg: string, alpha: number) =>
  "#" +
  rgb(fg)
    .map((v, i) => Math.round(v * alpha + rgb(bg)[i] * (1 - alpha)))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");

const WHITE = "#ffffff";
const ink = token("ink-900");

describe("text contrast (4.5:1)", () => {
  const light: Array<[string, string, string]> = [
    ["ink-900", "white", WHITE],
    ["ink-700", "surface-100", token("surface-100")],
    ["ink-600", "white", WHITE],
    ["ink-500", "white", WHITE],
    ["ink-500", "surface-100", token("surface-100")],
    ["ink-500", "surface-200", token("surface-200")],
    ["primary-700", "white", WHITE],
    ["primary-700", "primary-100", token("primary-100")],
    ["success-700", "success-100", token("success-100")],
    ["warning-700", "warning-100", token("warning-100")],
    ["error-700", "error-100", token("error-100")],
    ["error-700", "white", WHITE],
    ["info-700", "info-100", token("info-100")],
    ["info-700", "surface-100", token("surface-100")],
    ["accent-700", "white", WHITE],
    ["ink-900", "primary-500", token("primary-500")],
    ["ink-900", "primary-400", token("primary-400")],
  ];
  it.each(light)("%s on %s", (fg, _bgName, bg) => {
    expect(ratio(token(fg), bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Cooking Mode: white at stated opacity over the dark page, a 5% panel and a 10% chip.
  const surfaces: Array<[string, string]> = [
    ["page", ink],
    ["panel (white/5)", over(WHITE, ink, 0.05)],
    ["chip (white/10)", over(WHITE, ink, 0.1)],
  ];
  const opacities = [0.5, 0.6, 0.7, 0.8, 1];
  it.each(surfaces.flatMap(([name, bg]) => opacities.map((a) => [name, bg, a] as const)))(
    "white/%s text on dark %s",
    (_name, bg, alpha) => {
      expect(ratio(over(WHITE, bg, alpha), bg)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("documents the floor: white below 50% is not allowed for text", () => {
    // 40% fails on the panel and chip surfaces, which is why the app stops at /50.
    expect(ratio(over(WHITE, over(WHITE, ink, 0.1), 0.4), over(WHITE, ink, 0.1))).toBeLessThan(4.5);
  });
});

describe("non-text contrast (3:1)", () => {
  it("focus ring on light surfaces", () => {
    expect(ratio(token("info-700"), WHITE)).toBeGreaterThanOrEqual(3);
    expect(ratio(token("info-700"), token("surface-100"))).toBeGreaterThanOrEqual(3);
  });
  it("focus ring on the dark Cooking Mode surface", () => {
    expect(ratio(token("primary-400"), ink)).toBeGreaterThanOrEqual(3);
  });
  it("the global focus style uses the bright ring on dark surfaces", () => {
    expect(css).toMatch(/\.on-dark[^{]*:focus-visible\s*{[^}]*primary-400/);
    expect(css).toMatch(/summary/); // disclosure toggles get the same visible focus
  });
  it("respects reduced motion with a finite, near-instant animation", () => {
    const block = /@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?\n}\n/.exec(css)![0];
    expect(block).toContain("animation-duration: 0.01ms");
    expect(block).toContain("animation-iteration-count: 1");
    expect(block).toContain("transition-duration: 0.01ms");
  });
});
