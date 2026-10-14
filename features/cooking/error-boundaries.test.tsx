import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import FocusedCookingError from "@/app/(focused)/error";
import MainAppError from "@/app/(main)/error";
import GlobalError from "@/app/error";

describe("Error Boundaries", () => {
  it("renders FocusedCookingError with progress preservation reassurance", () => {
    const reset = vi.fn();
    const error = new Error("Rendering crashed in step view");

    const html = renderToStaticMarkup(<FocusedCookingError error={error} reset={reset} />);

    expect(html).toContain("Cooking session interrupted");
    expect(html).toContain("Your cooking progress, timers, and notes remain safely preserved");
    expect(html).toContain("Try resuming session");
    expect(html).toContain("Exit to Home");
    expect(html).toContain('href="/"');
  });

  it("renders MainAppError with safe data reassurance and retry control", () => {
    const reset = vi.fn();
    const error = new Error("Network timeout loading recipes");

    const html = renderToStaticMarkup(<MainAppError error={error} reset={reset} />);

    expect(html).toContain("Couldn&#x27;t load this page");
    expect(html).toContain(
      "Any saved recipes, shopping items, and kitchen checks on this device are preserved",
    );
    expect(html).toContain("Try again");
    expect(html).toContain("Back to Home");
    expect(html).toContain('href="/"');
  });

  it("renders GlobalError fallback cleanly", () => {
    const reset = vi.fn();
    const error = new Error("Fatal top-level crash");

    const html = renderToStaticMarkup(<GlobalError error={error} reset={reset} />);

    expect(html).toContain("Something went wrong");
    expect(html).toContain("Back to Home");
    expect(html).toContain('href="/"');
  });
});
