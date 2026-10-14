import axe, { type AxeResults, type Result } from "axe-core";

/**
 * Runs axe-core on a rendered fragment (jsdom). WCAG 2.0/2.1/2.2 A and AA
 * rules plus best practices.
 *
 * Limits, so nobody mistakes this for a full audit:
 * - jsdom has no layout engine, so `color-contrast` can't run here (and
 *   `target-size` / scroll rules need real geometry). Contrast is covered
 *   by `contrast.test.ts` against the design tokens and by axe runs in a
 *   real browser; touch-target sizes by class checks in component tests.
 * - Page-level rules (title, lang, landmarks) are skipped because
 *   fragments aren't pages.
 * - Automated rules find roughly a third of real accessibility problems.
 */
export async function axeViolations(container: Element): Promise<Result[]> {
  const results: AxeResults = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    },
    rules: {
      "color-contrast": { enabled: false },
      "target-size": { enabled: false },
      region: { enabled: false },
    },
  });
  return results.violations;
}

/** One line per violation, for readable assertion failures. */
export function describeViolations(violations: Result[]): string[] {
  return violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n` +
      v.nodes
        .slice(0, 3)
        .map((n) => `    ${n.target.join(" ")}  ${n.html.slice(0, 120)}`)
        .join("\n"),
  );
}
