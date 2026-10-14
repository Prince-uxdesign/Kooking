import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  MicButton,
  VoiceHelp,
  VoiceStatus,
  voiceStatusVisible,
  type VoiceFeedback,
} from "./VoiceControl";
import type { ListenState, ListenStatus } from "./voice-recognition";

const noop = () => {};
const st = (status: ListenStatus, message: string | null = null): ListenState => ({
  status,
  message,
});
const status = (state: ListenState | null, feedback: VoiceFeedback | null = null) =>
  renderToStaticMarkup(
    <VoiceStatus state={state} feedback={feedback} onStop={noop} onRetry={noop} />,
  );

describe("MicButton", () => {
  it("is absent before the check and when voice is unavailable", () => {
    expect(renderToStaticMarkup(<MicButton state={null} onStart={noop} onStop={noop} />)).toBe("");
    expect(
      renderToStaticMarkup(<MicButton state={st("unsupported")} onStart={noop} onStop={noop} />),
    ).toBe("");
  });

  it("off: a labelled 56px toggle that isn't pressed", () => {
    const html = renderToStaticMarkup(<MicButton state={st("off")} onStart={noop} onStop={noop} />);
    expect(html).toContain('aria-label="Start voice commands"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("min-h-[56px] min-w-[56px]");
  });

  it("on (requesting or listening): pressed, and labelled to stop", () => {
    for (const s of ["requesting", "listening"] as const) {
      const html = renderToStaticMarkup(<MicButton state={st(s)} onStart={noop} onStop={noop} />);
      expect(html).toContain('aria-label="Stop listening"');
      expect(html).toContain('aria-pressed="true"');
    }
  });
});

describe("VoiceStatus", () => {
  it("stays out of the way when the mic is off and there's nothing to say", () => {
    expect(status(st("off"))).toBe("");
    expect(status(null)).toBe("");
    expect(status(st("unsupported"))).toBe("");
    expect(voiceStatusVisible(st("off"), null)).toBe(false);
  });

  it("permission requested", () => {
    const html = status(st("requesting"));
    expect(html).toContain("Starting the mic");
    expect(html).toContain("allow access");
    expect(html).toContain(">Stop<");
  });

  it("listening: says the mic is on in words, with a Stop button", () => {
    const html = status(st("listening"));
    expect(html).toContain('role="status"');
    expect(html).toContain("Mic on · Listening");
    expect(html).toMatch(/<button[^>]*>.*Stop<\/button>/);
  });

  it("recognized → executed", () => {
    expect(status(st("listening"), { tone: "recognized", heard: "next step" })).toContain(
      "Got it…",
    );
    const html = status(st("listening"), {
      tone: "done",
      heard: "next step",
      text: "Step 1 done. Now on step 2",
    });
    expect(html).toContain("“next step”");
    expect(html).toContain("Step 1 done. Now on step 2");
    expect(html).toContain('aria-live="polite"');
  });

  it("not understood, clarification and explanation", () => {
    expect(
      status(st("listening"), {
        tone: "not-understood",
        heard: "blah",
        text: "Sorry, that isn't a command I know.",
      }),
    ).toContain("isn&#x27;t a command I know");
    expect(
      status(st("listening"), { tone: "clarify", heard: "pause", text: "Pause what?" }),
    ).toContain("Pause what?");
    expect(
      status(st("listening"), { tone: "info", heard: "next", text: "This is the last step." }),
    ).toContain("This is the last step.");
  });

  it("permission denied and errors explain and offer a retry", () => {
    const denied = status(st("denied", "Microphone access is blocked."));
    expect(denied).toContain("Microphone access is blocked.");
    expect(denied).toContain("Try again");
    const error = status(st("error", "Voice commands need an internet connection."));
    expect(error).toContain("internet connection");
    expect(error).toContain("Try again");
  });

  it("explains why listening stopped on its own", () => {
    const html = status(st("off", "Stopped listening after 2 minutes without a command."));
    expect(html).toContain("2 minutes");
    expect(html).not.toContain("Try again");
  });
});

describe("VoiceHelp", () => {
  it("unavailable: one line, and the buttons still do everything", () => {
    const html = renderToStaticMarkup(<VoiceHelp state={st("unsupported")} />);
    expect(html).toContain("Voice commands aren&#x27;t available in this browser");
    expect(html).toContain("works with the buttons");
  });

  it("lists only implemented commands and is honest about privacy", () => {
    const html = renderToStaticMarkup(<VoiceHelp state={st("off")} />);
    for (const say of [
      "Repeat that",
      "What&#x27;s the next step?",
      "Next step",
      "Previous step",
      "Start a ten-minute timer",
      "How much rice do I need?",
      "Stop listening",
    ]) {
      expect(html).toContain(say);
    }
    expect(html).toContain("online service");
    expect(html).toContain("doesn&#x27;t record audio or keep what");
    expect(html).not.toMatch(/processed (?:locally|on your device)/);
    expect(html).toContain("may not work offline");
  });
});
