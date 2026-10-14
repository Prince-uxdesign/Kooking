// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { StepDisplay } from "@/shared/domain/cooking-session";
import {
  applyTimerAction,
  createTimer,
  type SessionTimer,
  type TimerAction,
} from "@/shared/domain/timers";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { CookingStep } from "./CookingStep";
import { ReadAloudBar } from "./ReadAloud";
import { ScreenWakeControl } from "./ScreenWake";
import { OtherTimersBar, StepTimerCard, TimerAlertBanner } from "./TimerViews";
import { MicButton, VoiceHelp, VoiceStatus } from "./VoiceControl";
import type { ReadAloudStatus } from "./read-aloud";
import type { ListenStatus } from "./voice-recognition";

let mounted: Mounted | null = null;
afterEach(async () => {
  await mounted?.unmount();
  mounted = null;
});

const T0 = 1_800_000_000_000;
const noop = () => {};
const clean = async (el: Element) =>
  expect(describeViolations(await axeViolations(el))).toEqual([]);

const timer = (over: Partial<SessionTimer> = {}): SessionTimer => ({
  ...createTimer({ id: "t1", stepId: "s2", durationSeconds: 600, label: "Simmer base" }),
  ...over,
});

/* ------------------------------------------------------------------ */
/* Timer card: focus and announcements                                */
/* ------------------------------------------------------------------ */

function TimerHarness({ start }: { start: SessionTimer }) {
  const [t, setT] = useState(start);
  return (
    <main>
      <h1>Cooking</h1>
      <h2>Step 2 of 3</h2>
      {/* Simulates the clock running out. */}
      <button
        type="button"
        id="tick"
        onClick={() =>
          setT((cur) => ({
            ...cur,
            status: "done",
            finishedAt: T0 + 600_000,
            endsAt: null,
            remainingMs: 0,
          }))
        }
      >
        tick
      </button>
      <StepTimerCard
        timer={t}
        now={T0}
        readyCue="Oil gathers at the edges."
        onAction={(a: TimerAction) => setT((cur) => applyTimerAction(cur, a, T0))}
      />
    </main>
  );
}

const button = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as
    HTMLButtonElement | undefined;
const said = (root: HTMLElement) => root.querySelector('section [role="status"]')?.textContent;

describe("timer card (keyboard and screen reader)", () => {
  it("keeps focus on the main control through start, pause and resume", async () => {
    mounted = await mount(<TimerHarness start={timer()} />);
    const root = mounted.container;

    const start = button(root, "Start timer")!;
    start.focus();
    await act(async () => start.click());
    expect(document.activeElement).toBe(button(root, "Pause timer"));
    expect(said(root)).toBe("Simmer base started, 10 minutes.");

    await act(async () => button(root, "Pause timer")!.click());
    expect(document.activeElement).toBe(button(root, "Resume timer"));
    expect(said(root)).toBe("Simmer base paused.");

    await act(async () => button(root, "Resume timer")!.click());
    expect(document.activeElement).toBe(button(root, "Pause timer"));
    expect(said(root)).toBe("Simmer base resumed.");
  });

  it("returns focus to the card when a control disappears (Cancel)", async () => {
    mounted = await mount(<TimerHarness start={applyTimerAction(timer(), "start", T0)} />);
    const root = mounted.container;
    const cancel = button(root, "Cancel")!;
    cancel.focus();
    await act(async () => cancel.click());
    expect(root.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
    expect(button(root, "Start timer")).toBeTruthy();
    expect(said(root)).toBe("Simmer base stopped.");
  });

  it("never puts the ticking countdown in a live region", async () => {
    mounted = await mount(<TimerHarness start={applyTimerAction(timer(), "start", T0)} />);
    const live = [
      ...mounted.container.querySelectorAll('[role="status"],[aria-live],[role="timer"]'),
    ];
    for (const region of live) {
      expect(region.textContent).not.toMatch(/\d+:\d{2}/);
    }
    // The countdown text is silent (aria-hidden) with a single plain-language alternative.
    expect(mounted.container.querySelector('p [aria-hidden="true"]')?.textContent).toMatch(
      /\d+:\d{2}/,
    );
    expect(mounted.container.textContent).toContain("10 minutes left");
  });

  it("announces time's up once, without claiming the food is ready", async () => {
    mounted = await mount(<TimerHarness start={applyTimerAction(timer(), "start", T0)} />);
    await act(async () => (document.getElementById("tick") as HTMLElement).click());
    expect(said(mounted.container)).toBe(
      "Simmer base: time's up. A timer is a guide, not a sign the food is ready.",
    );
    expect(mounted.container.textContent).toContain("not a sign it's ready");
  });

  it("has no axe violations in any timer state", async () => {
    const running = applyTimerAction(timer(), "start", T0);
    const paused = applyTimerAction(running, "pause", T0 + 1000);
    const done: SessionTimer = {
      ...running,
      status: "done",
      finishedAt: T0,
      endsAt: null,
      remainingMs: 0,
    };
    for (const t of [timer(), running, paused, done]) {
      mounted = await mount(
        <main>
          <h1>Cooking</h1>
          <h2>Step 2 of 3</h2>
          <StepTimerCard timer={t} now={T0 + 5000} readyCue="Oil gathers." onAction={noop} />
        </main>,
      );
      await clean(mounted.container);
      await mounted.unmount();
      mounted = null;
    }
  });

  it("other-timers pill and finished-timer banner are named by what's on screen", async () => {
    const running = applyTimerAction(timer(), "start", T0);
    const done: SessionTimer = {
      ...running,
      status: "done",
      finishedAt: T0,
      endsAt: null,
      remainingMs: 0,
    };
    mounted = await mount(
      <main>
        <h1>Cooking</h1>
        <h2>Step 2 of 3</h2>
        <OtherTimersBar
          timers={[running, { ...done, id: "t2" }]}
          now={T0 + 1000}
          stepNumberOf={() => 2}
          onOpen={noop}
        />
        <TimerAlertBanner
          timers={[{ ...done, id: "t3" }]}
          stepNumberOf={() => 2}
          onGoTo={noop}
          onDismiss={noop}
        />
      </main>,
    );
    const pills = [...mounted.container.querySelectorAll('ul[aria-label="Other timers"] button')];
    expect(pills).toHaveLength(2);
    for (const p of pills) expect(p.hasAttribute("aria-label")).toBe(false); // name = visible text
    expect(pills[0].textContent).toContain("Simmer base");
    expect(pills[0].textContent).toContain("step 2. Go to step.");
    expect(mounted.container.querySelector('[role="alert"]')).toBeTruthy();
    await clean(mounted.container);
  });
});

/* ------------------------------------------------------------------ */
/* The step screen and its controls                                   */
/* ------------------------------------------------------------------ */

const step: StepDisplay = {
  id: "s2",
  image: null,
  number: 2,
  total: 3,
  instruction: "Simmer the tomato base on medium heat until the oil rises.",
  ingredients: [
    {
      lineId: "l",
      name: "Tomato paste",
      preparation: null,
      note: null,
      kind: "amount",
      quantity: "70 g",
      approximate: false,
      notScaled: false,
      portion: "all",
      totalQuantity: null,
      alsoInSteps: [],
      spoken: "Tomato paste: 70 g.",
    },
  ],
  heat: "Medium heat",
  duration: "10 min",
  timerLabel: "Simmer base",
  cues: [{ kind: "visual", label: "Look", text: "Oil gathers at the edges." }],
  preparationNotes: null,
  completionNote: "Base looks glossy.",
  safetyNote: "Hot oil can spit.",
  readinessCheck: "Base looks glossy.",
  isFirst: false,
  isLast: false,
  completed: false,
};

const progress = {
  current: 2,
  total: 3,
  completedCount: 1,
  incomplete: [2, 3],
  isFirst: false,
  isLast: false,
  currentCompleted: false,
  spoken: "Step 2 of 3, 1 step done",
};

const readStates: ReadAloudStatus[] = [
  "idle",
  "starting",
  "playing",
  "paused",
  "stopped",
  "done",
  "error",
  "unsupported",
];
const listenStates: ListenStatus[] = [
  "off",
  "requesting",
  "listening",
  "denied",
  "error",
  "unsupported",
];

describe("Cooking Mode screen", () => {
  const screen = (over: Partial<Parameters<typeof CookingStep>[0]> = {}) => (
    <CookingStep
      step={step}
      progress={progress}
      doneSteps={[true, false, false]}
      recipeTitle="Demo Tomato Rice"
      servings={4}
      demo
      paused={false}
      notice={null}
      error={null}
      busy={false}
      onPrevious={noop}
      onNext={noop}
      onFinish={noop}
      onPause={noop}
      onResume={noop}
      {...over}
    />
  );

  it("has no axe violations, in normal and paused states, with every control slot filled", async () => {
    const slots = {
      speechSlot: (
        <ReadAloudBar
          state={{ status: "idle", key: null, message: null }}
          stepNumber={2}
          hasContent
          auto={false}
          voices={[{ voiceURI: "v", name: "Ezinne", lang: "en-NG" }]}
          voiceURI={null}
          onPlay={noop}
          onPause={noop}
          onResume={noop}
          onStop={noop}
          onReplay={noop}
          onToggleAuto={noop}
          onVoice={noop}
        />
      ),
      voiceHelpSlot: <VoiceHelp state={{ status: "off", message: null }} />,
      wakeSlot: (
        <ScreenWakeControl
          state={{ status: "on", message: null, recovered: false }}
          enabled
          sessionPaused={false}
          onToggle={noop}
          onRetry={noop}
        />
      ),
      micSlot: <MicButton state={{ status: "off", message: null }} onStart={noop} onStop={noop} />,
      voiceStatusSlot: (
        <VoiceStatus
          state={{ status: "listening", message: null }}
          feedback={{ tone: "done", heard: "next step", text: "Step 1 done. Now on step 2" }}
          onStop={noop}
          onRetry={noop}
        />
      ),
    };
    for (const over of [
      {},
      { paused: true },
      { error: "That action isn't available right now." },
    ]) {
      mounted = await mount(<main>{screen({ ...slots, ...over })}</main>);
      await clean(mounted.container);
      await mounted.unmount();
      mounted = null;
    }
  });

  it("exposes the current step and overall progress to screen readers", async () => {
    mounted = await mount(<main>{screen()}</main>);
    const bar = mounted.container.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-valuetext")).toBe("Step 2 of 3, 1 step done");
    expect(bar.getAttribute("aria-label")).toBe("Cooking progress");
    // The step heading is the focus target after each step change.
    const h2 = mounted.container.querySelector("h2")!;
    expect(h2.textContent).toContain("Step 2 of 3");
    expect(h2.getAttribute("tabindex")).toBe("-1");
    // Completed steps use text, not colour alone.
    await mounted.rerender(<main>{screen({ step: { ...step, completed: true } })}</main>);
    expect(mounted.container.querySelector("h2")!.textContent).toContain("Done");
  });

  it("keeps every touch control at least 44px tall and uses real buttons", async () => {
    mounted = await mount(<main>{screen()}</main>);
    const nav = mounted.container.querySelector('nav[aria-label="Step controls"]')!;
    const buttons = [...nav.querySelectorAll("button")];
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    for (const b of buttons) {
      expect(b.className).toMatch(/min-h-(14|\[(4[4-9]|5\d)px\])|h-(11|12|14)/);
    }
    expect(mounted.container.querySelectorAll("[onclick], div[role=button]")).toHaveLength(0);
  });

  it("the Back button's name contains its visible text", async () => {
    mounted = await mount(<main>{screen()}</main>);
    const back = [...mounted.container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Back"),
    )!;
    expect(back.getAttribute("aria-label")).toBe("Back to previous step");
    expect(back.getAttribute("aria-label")).toContain("Back");
  });
});

describe("read-aloud, voice and wake status controls", () => {
  it.each(readStates)("read-aloud '%s' has no violations and a text status", async (status) => {
    mounted = await mount(
      <main>
        <ReadAloudBar
          state={{
            status,
            key: "k",
            message: status === "error" ? "Couldn't read this step." : null,
          }}
          stepNumber={2}
          hasContent
          auto
          voices={[]}
          voiceURI={null}
          onPlay={noop}
          onPause={noop}
          onResume={noop}
          onStop={noop}
          onReplay={noop}
          onToggleAuto={noop}
          onVoice={noop}
        />
      </main>,
    );
    await clean(mounted.container);
    const buttons = [...mounted.container.querySelectorAll("button")];
    for (const b of buttons) {
      // Every control has a name; the toggle states its state in words, not colour.
      expect((b.getAttribute("aria-label") ?? b.textContent ?? "").trim().length).toBeGreaterThan(
        0,
      );
    }
  });

  it.each(listenStates)("voice '%s' has no violations", async (status) => {
    mounted = await mount(
      <main>
        <MicButton state={{ status, message: null }} onStart={noop} onStop={noop} />
        <VoiceStatus
          state={{ status, message: status === "denied" ? "Microphone access is blocked." : null }}
          feedback={null}
          onStop={noop}
          onRetry={noop}
        />
        <VoiceHelp state={{ status, message: null }} />
      </main>,
    );
    await clean(mounted.container);
  });

  it("the mic toggle reports pressed state and changes its name", async () => {
    mounted = await mount(
      <MicButton state={{ status: "listening", message: null }} onStart={noop} onStop={noop} />,
    );
    const b = mounted.container.querySelector("button")!;
    expect(b.getAttribute("aria-pressed")).toBe("true");
    expect(b.getAttribute("aria-label")).toBe("Stop listening");
  });

  it.each([
    [{ status: "on", message: null, recovered: false }, true],
    [{ status: "requesting", message: null, recovered: false }, true],
    [{ status: "unavailable", message: "Couldn't keep the screen on.", recovered: false }, true],
    [{ status: "on", message: null, recovered: true }, true],
    [{ status: "off", message: null, recovered: false }, false],
    [{ status: "unsupported", message: null, recovered: false }, true],
  ] as const)("screen wake %o has no violations", async (state, enabled) => {
    mounted = await mount(
      <main>
        <ScreenWakeControl
          state={state}
          enabled={enabled}
          sessionPaused={false}
          onToggle={noop}
          onRetry={noop}
        />
      </main>,
    );
    await clean(mounted.container);
  });
});
