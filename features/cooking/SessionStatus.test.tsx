import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SessionStatus } from "./SessionStatus";

const render = (over: Partial<Parameters<typeof SessionStatus>[0]> = {}) =>
  renderToStaticMarkup(
    <SessionStatus online saveFailed={false} syncNotice={null} onRetry={() => {}} {...over} />,
  );

describe("SessionStatus", () => {
  it("stays silent when online and saved", () => {
    expect(render()).toBe("");
  });

  it("says plainly when a save failed and offers a retry", () => {
    const html = render({ saveFailed: true });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Not saved.");
    expect(html).toContain("last saved step is still safe");
    expect(html).toContain("Try saving again");
  });

  it("explains what works offline without claiming a sync", () => {
    const html = render({ online: false });
    expect(html).toContain("You&#x27;re offline");
    expect(html).toContain("progress keeps saving here");
    expect(html).not.toContain("sync");
  });

  it("shows when progress came from another tab", () => {
    expect(render({ syncNotice: "Updated with progress from another tab or window." })).toContain(
      "another tab",
    );
  });
});
