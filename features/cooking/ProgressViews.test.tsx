import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyTimerAction, createTimer } from "@/shared/domain/timers";
import { CompletionScreen } from "./CompletionScreen";
import { FinishPrompt } from "./FinishPrompt";

const T0 = 1_800_000_000_000;
const noop = () => {};

describe("FinishPrompt", () => {
  it("names unfinished steps and offers a way back to the first", () => {
    const html = renderToStaticMarkup(
      <FinishPrompt
        check={{ kind: "incomplete-steps", steps: [1, 2] }}
        now={T0}
        onGoToStep={noop}
        onConfirmStopTimers={noop}
        onDismiss={noop}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Steps 1 and 2 aren&#x27;t marked done yet");
    expect(html).toContain("Go to step 1");
  });

  it("asks before stopping a running timer", () => {
    const t = applyTimerAction(
      createTimer({ id: "t", stepId: "s", durationSeconds: 600, label: "Simmer base" }),
      "start",
      T0,
    );
    const html = renderToStaticMarkup(
      <FinishPrompt
        check={{ kind: "timers-running", timers: [t] }}
        now={T0 + 7 * 60_000}
        onGoToStep={noop}
        onConfirmStopTimers={noop}
        onDismiss={noop}
      />,
    );
    expect(html).toContain("Simmer base (3:00 left)");
    expect(html).toContain("Finish and stop timer");
    expect(html).toContain("Keep cooking");
  });

  it("renders nothing when finishing can go straight through", () => {
    expect(
      renderToStaticMarkup(
        <FinishPrompt
          check={{ kind: "ready" }}
          now={T0}
          onGoToStep={noop}
          onConfirmStopTimers={noop}
          onDismiss={noop}
        />,
      ),
    ).toBe("");
  });
});

describe("CompletionScreen", () => {
  it("summarises the finished session with ways to continue", () => {
    const html = renderToStaticMarkup(
      <CompletionScreen
        summary={{
          recipeTitle: "Demo Tomato Rice",
          servings: 4,
          stepsDone: 3,
          minutes: 75,
          completedAt: T0,
        }}
        recipeSlug="demo-tomato-rice"
        demo
        justFinished
      />,
    );
    expect(html).toContain("You did it");
    expect(html).toContain("Demo Tomato Rice · 4 servings");
    expect(html).toContain(">3<");
    expect(html).toContain("1 hr 15 min");
    expect(html).toContain("demo recipe, not chef-tested");
    expect(html).toContain('href="/recipes/demo-tomato-rice/kitchen-check?servings=4"');
    expect(html).toContain("Back to Home");
  });

  it("uses a neutral title when reopened later", () => {
    const html = renderToStaticMarkup(
      <CompletionScreen
        summary={{ recipeTitle: "X", servings: 2, stepsDone: 1, minutes: 5, completedAt: T0 }}
        recipeSlug="x"
        demo={false}
        justFinished={false}
      />,
    );
    expect(html).toContain("Cooking complete");
  });
});
