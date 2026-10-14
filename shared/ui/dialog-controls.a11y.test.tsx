// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { BottomSheet } from "./BottomSheet";
import { Modal } from "./Modal";
import { QuantityInput } from "./QuantityInput";
import { EmptyState, ErrorState } from "./States";

let mounted: Mounted | null = null;
afterEach(async () => {
  await mounted?.unmount();
  mounted = null;
  document.body.style.overflow = "";
});

const key = (k: string, init: KeyboardEventInit = {}) =>
  act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...init }));
  });

/** A page with a trigger that opens the dialog, like the real screens. */
function WithTrigger({ sheet = false }: { sheet?: boolean }) {
  const [open, setOpen] = useState(false);
  const Dialog = sheet ? BottomSheet : Modal;
  return (
    <main>
      <h1>Page</h1>
      <button type="button" id="opener" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog title="Settings" open={open} onClose={() => setOpen(false)}>
        <label>
          Name <input id="first" type="text" />
        </label>
        <button type="button" id="last">
          Save
        </button>
      </Dialog>
    </main>
  );
}

describe.each([
  ["Modal", false],
  ["BottomSheet", true],
])("%s keyboard behaviour", (_name, sheet) => {
  it("moves focus in, traps Tab, closes on Escape and returns focus to the trigger", async () => {
    mounted = await mount(<WithTrigger sheet={sheet} />);
    const opener = document.getElementById("opener") as HTMLButtonElement;
    opener.focus();
    await act(async () => opener.click());

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Settings");
    expect(dialog.contains(document.activeElement)).toBe(true); // focus moved in
    expect(document.body.style.overflow).toBe("hidden"); // page behind can't scroll

    // Tab from the last control wraps to the first, Shift+Tab goes back.
    const last = document.getElementById("last") as HTMLElement;
    last.focus();
    await key("Tab");
    const first = dialog.querySelector("button") as HTMLElement; // the close button
    expect(document.activeElement).toBe(first);
    await key("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);

    // Focus that has strayed outside is pulled back in.
    opener.focus();
    await key("Tab");
    expect(dialog.contains(document.activeElement)).toBe(true);

    await key("Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("");
  });

  it("has an accessible name and no axe violations while open", async () => {
    mounted = await mount(<WithTrigger sheet={sheet} />);
    await act(async () => (document.getElementById("opener") as HTMLElement).click());
    expect(describeViolations(await axeViolations(document.body))).toEqual([]);
  });
});

describe("QuantityInput", () => {
  function Harness({ initial = 4, max = 6 }: { initial?: number; max?: number }) {
    const [v, setV] = useState(initial);
    return <QuantityInput label="Servings" value={v} min={1} max={max} onChange={setV} />;
  }

  it("has no axe violations", async () => {
    mounted = await mount(
      <main>
        <Harness />
      </main>,
    );
    expect(describeViolations(await axeViolations(mounted.container))).toEqual([]);
  });

  it("keeps focus on the button when the limit is reached (aria-disabled, not disabled)", async () => {
    mounted = await mount(<Harness initial={5} max={6} />);
    const inc = mounted.container.querySelector(
      'button[aria-label^="Increase"]',
    ) as HTMLButtonElement;
    inc.focus();
    await act(async () => inc.click());
    expect(
      mounted.container.querySelector('[role="spinbutton"]')?.getAttribute("aria-valuenow"),
    ).toBe("6");
    expect(inc.getAttribute("aria-disabled")).toBe("true");
    expect(inc.disabled).toBe(false);
    expect(document.activeElement).toBe(inc); // focus not lost

    // Pressing it again at the limit does nothing.
    await act(async () => inc.click());
    expect(
      mounted.container.querySelector('[role="spinbutton"]')?.getAttribute("aria-valuenow"),
    ).toBe("6");
  });

  it("says the new value once per button press, and doesn't double-announce keyboard changes", async () => {
    mounted = await mount(<Harness />);
    const status = () => mounted!.container.querySelector('[role="status"]')?.textContent;
    const dec = mounted.container.querySelector(
      'button[aria-label^="Decrease"]',
    ) as HTMLButtonElement;
    await act(async () => dec.click());
    expect(status()).toBe("Servings: 3");

    const spin = mounted.container.querySelector('[role="spinbutton"]') as HTMLElement;
    expect(spin.hasAttribute("aria-live")).toBe(false);
    await act(async () => {
      spin.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    });
    expect(spin.getAttribute("aria-valuenow")).toBe("4");
    expect(status()).toBe(""); // the spinbutton's own value is announced natively
  });

  it("supports the spinbutton keyboard keys", async () => {
    mounted = await mount(<Harness />);
    const spin = mounted.container.querySelector('[role="spinbutton"]') as HTMLElement;
    const press = (k: string) =>
      act(async () => {
        spin.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      });
    await press("Home");
    expect(spin.getAttribute("aria-valuenow")).toBe("1");
    await press("End");
    expect(spin.getAttribute("aria-valuenow")).toBe("6");
    await press("PageDown");
    expect(spin.getAttribute("aria-valuenow")).toBe("4");
  });
});

describe("state cards", () => {
  it("use the heading level they're given, so pages don't skip levels", async () => {
    mounted = await mount(
      <main>
        <h1>Saved</h1>
        <EmptyState headingLevel={2} title="Saved is on its way" message="Soon." />
      </main>,
    );
    expect(mounted.container.querySelector("h2")?.textContent).toBe("Saved is on its way");
    expect(describeViolations(await axeViolations(mounted.container))).toEqual([]);
  });

  it("defaults to a section-level heading and can stand in as the page heading", async () => {
    mounted = await mount(
      <main>
        <ErrorState headingLevel={1} />
      </main>,
    );
    expect(mounted.container.querySelector("h1")).toBeTruthy();
    await mounted.rerender(
      <section>
        <h2>Recipes</h2>
        <EmptyState title="Nothing yet" message="Check back." />
      </section>,
    );
    expect(mounted.container.querySelector("h3")).toBeTruthy();
  });

  it("announces an error state as an alert with an actionable retry", async () => {
    const retry = vi.fn();
    mounted = await mount(
      <main>
        <ErrorState headingLevel={1} onRetry={retry} />
      </main>,
    );
    expect(mounted.container.querySelector('[role="alert"]')).toBeTruthy();
    await act(async () => (mounted!.container.querySelector("button") as HTMLElement).click());
    expect(retry).toHaveBeenCalledTimes(1);
    expect(describeViolations(await axeViolations(mounted.container))).toEqual([]);
  });
});
