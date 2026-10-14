// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { KitchenCheckDemo } from "./KitchenCheckDemo";
import { Stories } from "./Stories";
import { Testimonials } from "./Testimonials";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

let mounted: Mounted | null = null;
afterEach(async () => {
  await mounted?.unmount();
  mounted = null;
});

const click = (el: Element) =>
  act(async () => {
    (el as HTMLElement).click();
  });
const byText = (root: Element, text: string) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;

describe("Kitchen Check demo", () => {
  it("rescales with the real engine and turns ready when every required item is in", async () => {
    mounted = await mount(<KitchenCheckDemo />);
    const { container } = mounted;
    // 500 g rice for 4 → 750 g for 6 (default servings).
    expect(container.textContent).toContain("750 g");
    await click(container.querySelector('[aria-label="More servings"]')!);
    expect(container.textContent).toContain("7 servings");

    expect(container.textContent).toContain("3 to buy");
    await click(byText(container, "Have tomato purée?"));
    await click(byText(container, "Scotch bonnet"));
    await click(byText(container, "Chicken stock"));
    expect(container.textContent).toContain("Ready to cook.");
  });

  it("has no axe violations", async () => {
    mounted = await mount(<KitchenCheckDemo />);
    expect(describeViolations(await axeViolations(mounted.container))).toEqual([]);
  });
});

describe("Stories", () => {
  it("switches story with tabs and arrow keys, with no axe violations", async () => {
    mounted = await mount(<Stories />);
    const { container } = mounted;
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    await click(tabs[1]);
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toContain("Manchester");
    await act(async () => {
      tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(container.querySelector('[role="tabpanel"]')!.textContent).toContain("Abuja");
    expect(describeViolations(await axeViolations(container))).toEqual([]);
  });
});

describe("Testimonials", () => {
  it("labels the voices as illustrative, shows no ratings, and has no axe violations", async () => {
    mounted = await mount(<Testimonials />);
    const { container } = mounted;
    expect(container.textContent).toContain("Illustrative voices");
    expect(container.textContent).not.toMatch(/★|\d\.\d\s*(stars?|\/\s*5)|\d+\+?\s*reviews/i);
    expect(describeViolations(await axeViolations(container))).toEqual([]);
  });
});
