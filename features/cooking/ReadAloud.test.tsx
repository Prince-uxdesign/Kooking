import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ReadAloudStatus } from "./read-aloud";
import { ReadAloud, ReadAloudBar, type ReadAloudBarProps } from "./ReadAloud";

const noop = () => {};
const render = (status: ReadAloudStatus | null, over: Partial<ReadAloudBarProps> = {}) =>
  renderToStaticMarkup(
    <ReadAloudBar
      state={status ? { status, key: "k", message: null } : null}
      stepNumber={3}
      hasContent
      auto={false}
      voices={[]}
      voiceURI={null}
      onPlay={noop}
      onPause={noop}
      onResume={noop}
      onStop={noop}
      onReplay={noop}
      onToggleAuto={noop}
      onVoice={noop}
      {...over}
    />,
  );

describe("ReadAloudBar", () => {
  it("renders only a placeholder until the browser is checked", () => {
    const html = render(null);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<button");
  });

  it("says plainly when speech isn't available, with no dead controls", () => {
    const html = render("unsupported");
    expect(html).toContain("Read-aloud isn&#x27;t available in this browser");
    expect(html).not.toContain("<button");
  });

  it("idle: one read button and the auto-read toggle, nothing announced", () => {
    const html = render("idle");
    expect(html).toContain('aria-label="Read aloud"');
    expect(html).toContain("Read this step");
    expect(html).not.toContain("Pause");
    expect(html).not.toContain("Stop");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toMatch(/role="status"[^>]*><\/p>/);
  });

  it("playing: pause, replay and stop, with a short status (not the instruction)", () => {
    const html = render("playing");
    expect(html).toContain('aria-label="Pause reading"');
    expect(html).toContain('aria-label="Replay this step"');
    expect(html).toContain('aria-label="Stop reading"');
    expect(html).toContain("Reading step 3 aloud");
    expect(html).not.toContain("Read this step");
  });

  it("starting is shown as text and can be paused or stopped", () => {
    const html = render("starting");
    expect(html).toContain("Starting…");
    expect(html).toContain("Pause reading");
    expect(html).toContain("Stop reading");
  });

  it("paused: resume replaces pause", () => {
    const html = render("paused");
    expect(html).toContain('aria-label="Resume reading"');
    expect(html).not.toContain("Pause reading");
    expect(html).toContain("Paused</p>");
  });

  it("stopped and done go back to a single read button with their status", () => {
    expect(render("stopped")).toContain("Stopped");
    expect(render("stopped")).toContain("Read this step");
    expect(render("done")).toContain("Finished reading step 3");
  });

  it("doesn't call a voice answer 'step N'", () => {
    const answer = renderToStaticMarkup(
      <ReadAloudBar
        state={{ status: "playing", key: "voice:1", message: null }}
        stepNumber={3}
        readKey="s:3"
        hasContent
        auto={false}
        voices={[]}
        voiceURI={null}
        onPlay={noop}
        onPause={noop}
        onResume={noop}
        onStop={noop}
        onReplay={noop}
        onToggleAuto={noop}
        onVoice={noop}
      />,
    );
    expect(answer).toContain("Reading aloud");
    expect(answer).not.toContain("Reading step 3");
  });

  it("shows the error message as text", () => {
    const html = renderToStaticMarkup(
      <ReadAloudBar
        state={{ status: "error", key: "k", message: "Another app is using the speaker." }}
        stepNumber={1}
        hasContent
        auto={false}
        voices={[]}
        voiceURI={null}
        onPlay={noop}
        onPause={noop}
        onResume={noop}
        onStop={noop}
        onReplay={noop}
        onToggleAuto={noop}
        onVoice={noop}
      />,
    );
    expect(html).toContain("Another app is using the speaker.");
    expect(html).toContain("Read this step");
  });

  it("disables reading when the step has nothing to read", () => {
    const html = render("idle", { hasContent: false });
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Read this step/);
    expect(html).toContain("nothing to read for this step");
  });

  it("auto-read state is text and aria-pressed, not colour alone", () => {
    const on = render("idle", { auto: true });
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain(">On<");
    expect(render("idle")).toContain(">Off<");
  });

  it("offers device voices with a default, and no picker without voices", () => {
    expect(render("idle")).not.toContain("<select");
    const html = render("idle", {
      voices: [{ voiceURI: "ng", name: "Ezinne", lang: "en-NG" }],
      voiceURI: "ng",
    });
    expect(html).toContain("Voice: Ezinne");
    expect(html).toContain("Device default");
    expect(html).toContain("Ezinne (en-NG)");
    expect(html).toContain("Choose a voice");
  });

  it("gives every control a large touch target", () => {
    const html = render("playing");
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBe(4);
    for (const b of buttons) expect(b).toContain("min-h-[52px]");
  });
});

describe("ReadAloud (server render)", () => {
  it("renders without touching browser speech APIs", () => {
    const html = renderToStaticMarkup(
      <ReadAloud
        readKey="s:1"
        segments={["Step 1 of 1."]}
        stepNumber={1}
        lang="en"
        paused={false}
      />,
    );
    expect(html).toContain("min-h-[52px]");
  });
});
