import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { StepDisplay } from "@/shared/domain/cooking-session";
import { CookingStep, type CookingStepProps } from "./CookingStep";

const step: StepDisplay = {
  id: "s2",
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
  completionNote: null,
  safetyNote: null,
  readinessCheck: "Oil gathers at the edges.",
  isFirst: false,
  isLast: false,
  completed: false,
};

const noop = () => {};
const render = (over: Partial<CookingStepProps> = {}) =>
  renderToStaticMarkup(
    <CookingStep
      step={step}
      progress={{
        current: 2,
        total: 3,
        completedCount: 1,
        incomplete: [2, 3],
        isFirst: false,
        isLast: false,
        currentCompleted: false,
        spoken: "Step 2 of 3, 1 step done",
      }}
      doneSteps={[true, false, false]}
      recipeTitle="Demo Tomato Rice"
      servings={4}
      demo={false}
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
    />,
  );

describe("CookingStep", () => {
  it("shows context, progress and the instruction with one primary action", () => {
    const html = render();
    expect(html).toContain("Demo Tomato Rice");
    expect(html).toContain("4 servings");
    expect(html).toContain("Step 2 of 3");
    expect(html).toContain('aria-valuetext="Step 2 of 3, 1 step done"');
    expect(html).toContain("1 of 3 done");
    expect(html).toContain(step.instruction);
    expect(html).toContain("Done, next step");
    expect(html).not.toContain("Finish cooking");
    expect(html).toContain('aria-label="Previous step"');
    expect(html).toContain(">Back<");
    expect(html).toContain('aria-label="Step controls"');
  });

  it("shows supporting details when present", () => {
    const html = render();
    expect(html).toContain("Medium heat");
    expect(html).toContain("10 min");
    expect(html).toContain("Timer: Simmer base");
    expect(html).toContain("What to look for");
    expect(html).toContain("You need for this step");
    expect(html).toContain("70 g");
  });

  it("omits detail sections entirely when metadata is missing", () => {
    const html = render({
      step: {
        ...step,
        ingredients: [],
        heat: null,
        duration: null,
        timerLabel: null,
        cues: [],
      },
    });
    expect(html).not.toContain("Step details");
    expect(html).not.toContain("What to look for");
    expect(html).not.toContain("You need for this step");
  });

  it("shows ingredients right after the instruction, readable as one sentence each", () => {
    const html = render({
      step: {
        ...step,
        ingredients: [
          {
            ...step.ingredients[0],
            name: "Long-grain parboiled rice from the big bag",
            preparation: "rinsed",
            portion: "part",
            totalQuantity: "400 g",
            quantity: "200 g",
            alsoInSteps: [3],
            spoken:
              "Long-grain parboiled rice from the big bag, rinsed: 200 g, part of 400 g in total.",
          },
        ],
      },
    });
    expect(html.indexOf(step.instruction)).toBeLessThan(html.indexOf("You need for this step"));
    expect(html.indexOf("You need for this step")).toBeLessThan(html.indexOf("Medium heat"));
    expect(html).toContain(
      'class="sr-only">Long-grain parboiled rice from the big bag, rinsed: 200 g',
    );
    expect(html).toContain("Part of 400 g · Also in step 3");
    expect(html).toMatch(/break-words[^"]*">Long-grain parboiled rice/);
  });

  it("shows every cue with labels, the completion check, safety and a time reminder", () => {
    const html = render({
      hasTimer: true,
      step: {
        ...step,
        cues: [
          { kind: "visual", label: "Look", text: "Soft and golden." },
          { kind: "texture", label: "Feel", text: "Limp, not crisp." },
          { kind: "aroma", label: "Smell", text: "Sweet." },
          { kind: "sound", label: "Listen", text: "A gentle sizzle." },
          { kind: "other", label: "Also notice", text: "Halved in size." },
        ],
        completionNote: "No white left.",
        safetyNote: "Oil spits when the onions go in.",
      },
    });
    for (const text of ["Look", "Feel", "Smell", "Listen", "Also notice", "A gentle sizzle."]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("Ready to move on when");
    expect(html).toContain("No white left.");
    expect(html).toContain("Times are a guide. Go by these signs before moving on.");
    expect(html).toContain("Safety: </span>Oil spits");
    // Instruction first, then safety, then ingredients, then cues.
    const order = [step.instruction, "Safety:", "You need for this step", "What to look for"].map(
      (t) => html.indexOf(t),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("shows only the completion check when a step has no sensory cues", () => {
    const html = render({ step: { ...step, cues: [], completionNote: "Grains separate." } });
    expect(html).toContain("Ready to move on when");
    expect(html).not.toContain("What to look for");
  });

  it("renders no cue container at all for a step without cues or completion", () => {
    const html = render({ step: { ...step, cues: [], completionNote: null, safetyNote: null } });
    expect(html).not.toContain('id="step-cues"');
    expect(html).not.toContain("Safety");
    expect(html).not.toContain("Times are a guide");
  });

  it("omits the time reminder when the step has no time information", () => {
    const html = render({
      step: { ...step, heat: null, duration: null, timerLabel: null, completionNote: "Done." },
    });
    expect(html).toContain("Ready to move on when");
    expect(html).not.toContain("Times are a guide");
  });

  it("wraps long cue text", () => {
    const long = "Glossy, thick and pulling away from the sides of the pot ".repeat(5).trim();
    const html = render({
      step: { ...step, cues: [{ kind: "visual", label: "Look", text: long }] },
    });
    expect(html).toContain(`break-words text-[17px] leading-7 text-white">${long}`);
  });

  it("wraps long instructions instead of truncating them", () => {
    const long = "Stir gently and keep stirring ".repeat(40).trim();
    const html = render({ step: { ...step, instruction: long } });
    expect(html).toContain(long);
    expect(html).toMatch(/break-words[^"]*text-\[24px\]/);
  });

  it("disables Previous on the first step and shows Finish on the last", () => {
    expect(render({ step: { ...step, isFirst: true, number: 1 } })).toMatch(
      /disabled=""[^>]*aria-label="Previous step"/,
    );
    const last = render({ step: { ...step, isLast: true, number: 3 } });
    expect(last).toContain("Finish cooking");
    expect(last).not.toContain("Done, next step");
  });

  it("swaps the primary action to Resume while paused and blocks step moves", () => {
    const html = render({ paused: true });
    expect(html).toContain("Resume cooking");
    expect(html).not.toContain("Done, next step");
    expect(html).toContain("Cooking is paused");
    expect(html).not.toContain(">Pause<");
  });

  it("labels demo content as not chef-tested", () => {
    expect(render({ demo: true })).toContain("Demo recipe · not chef-tested");
    expect(render()).not.toContain("Demo recipe");
  });
});
