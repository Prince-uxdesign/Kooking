import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyTimerAction, createTimer, settleTimers } from "@/shared/domain/timers";
import { AlertControls, OtherTimersBar, StepTimerCard, TimerAlertBanner } from "./TimerViews";

const T0 = 1_800_000_000_000;
const idle = createTimer({ id: "t", stepId: "s2", durationSeconds: 600, label: "Simmer base" });
const running = applyTimerAction(idle, "start", T0);
const paused = applyTimerAction(running, "pause", T0 + 90_000);
const done = settleTimers([running], T0 + 600_000).timers[0];
const card = (timer = idle, now = T0) =>
  renderToStaticMarkup(
    <StepTimerCard timer={timer} now={now} readyCue="Base looks glossy." onAction={() => {}} />,
  );

describe("StepTimerCard", () => {
  it("shows the label, full duration and a Start button before starting", () => {
    const html = card();
    expect(html).toContain("Simmer base");
    expect(html).toContain("10:00");
    expect(html).toContain("10 minutes, not started");
    expect(html).toContain("Start timer");
  });

  it("shows live remaining time with Pause and Cancel while running", () => {
    const html = card(running, T0 + 61_000);
    expect(html).toContain("8:59");
    expect(html).toContain("Pause timer");
    expect(html).toContain('aria-label="Cancel Simmer base timer"');
  });

  it("shows paused state in words with Resume", () => {
    const html = card(paused, T0 + 999_999);
    expect(html).toContain("8:30");
    expect(html).toContain("Paused");
    expect(html).toContain("Resume timer");
  });

  it("says time's up without claiming the food is ready, and repeats the recipe cue", () => {
    const html = card(done, T0 + 600_000 + 5 * 60_000);
    expect(html).toContain("Time&#x27;s up");
    expect(html).toContain("Finished 5 min ago");
    expect(html).toContain("not a sign it&#x27;s ready");
    expect(html).toContain("Check: Base looks glossy.");
    expect(html).toContain("OK, checking");
    expect(html).toContain("Reset");
  });
});

describe("AlertControls", () => {
  const controls = (over = {}) =>
    renderToStaticMarkup(
      <AlertControls
        soundOn
        soundAvailable
        notifications="default"
        onToggleSound={() => {}}
        onEnableNotifications={() => {}}
        {...over}
      />,
    );

  it("offers a sound toggle and an opt-in for background alerts", () => {
    const html = controls();
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Alert me in the background");
    expect(html).toContain("can&#x27;t fire if the browser is closed");
  });

  it("explains when notifications are denied and when sound is unavailable", () => {
    const html = controls({ notifications: "denied", soundAvailable: false });
    expect(html).toContain("blocked in your browser settings");
    expect(html).toContain("Sound isn&#x27;t available here");
    expect(html).not.toContain("Alert me in");
  });
});

describe("other timers", () => {
  it("shows running timers from other steps with step numbers for screen readers", () => {
    const html = renderToStaticMarkup(
      <OtherTimersBar
        timers={[running]}
        now={T0 + 60_000}
        stepNumberOf={() => 2}
        onOpen={() => {}}
      />,
    );
    expect(html).toContain("9:00");
    expect(html).toContain("Simmer base, step 2: 9 minutes left. Go to step.");
  });

  it("raises a finished timer from another step as an alert", () => {
    const html = renderToStaticMarkup(
      <TimerAlertBanner
        timers={[done]}
        stepNumberOf={() => 2}
        onGoTo={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Simmer base (step 2): time&#x27;s up");
  });
});
