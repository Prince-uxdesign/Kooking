import { describe, expect, it } from "vitest";
import seedJson from "../../content/seed/demo-tomato-rice.json";
import { stepDisplay } from "./cooking-session";
import { CUE_KINDS, readinessCheck, stepCues } from "./cues";
import { deriveTips } from "./recipe-detail";
import { recipeSchema, recipeStepSchema } from "./recipe-schema";
import { applySessionTimer, settleSessionTimers, startSession } from "./session";

const base = { id: "s1", order: 1, instruction: "Fry the onions." };
const parseStep = (extra: Record<string, unknown>) =>
  recipeStepSchema.safeParse({ ...base, ...extra });

describe("cue schema", () => {
  it("accepts every cue type together", () => {
    const r = parseStep({
      heat: "medium",
      estimatedMinutes: 8,
      timer: { durationSeconds: 480, label: "Fry onions" },
      cues: {
        visual: "Soft and golden.",
        texture: "Limp, not crisp.",
        aroma: "Sweet.",
        sound: "A gentle sizzle.",
      },
      sensoryCue: "They shrink by about half.",
      completionNote: "Golden at the edges, no white left.",
      safetyNote: "Oil spits when the onions go in.",
    });
    expect(r.success).toBe(true);
  });

  it("requires none of them", () => {
    expect(parseStep({}).success).toBe(true);
    expect(parseStep({ cues: {} }).success).toBe(true);
  });

  it.each([
    [{ cues: { visual: "" } }, "empty cue"],
    [{ cues: { visual: "   " } }, "whitespace-only cue"],
    [{ cues: { colour: "Red" } }, "unknown cue kind"],
    [{ cues: { aroma: "x".repeat(301) } }, "over-long cue"],
    [{ completionNote: "" }, "empty completion guidance"],
    [{ safetyNote: "" }, "empty safety note"],
    [{ heat: "nuclear" }, "unknown heat level"],
    [{ timer: { durationSeconds: 2 } }, "too-short timer"],
  ] as Array<[Record<string, unknown>, string]>)("rejects invalid metadata: %s (%s)", (extra) => {
    expect(parseStep(extra).success).toBe(false);
  });
});

describe("stepCues", () => {
  it("returns cues in a fixed order with plain labels", () => {
    const cues = stepCues({
      cues: { sound: "Sizzle.", visual: "Golden.", aroma: "Sweet.", texture: "Soft." },
      sensoryCue: "Halved in size.",
    });
    expect(cues.map((c) => c.kind)).toEqual([...CUE_KINDS]);
    expect(cues.map((c) => c.label)).toEqual(["Look", "Feel", "Smell", "Listen", "Also notice"]);
  });

  it("returns only what's present", () => {
    expect(stepCues({ cues: { texture: "Thick enough to coat a spoon." } })).toEqual([
      { kind: "texture", label: "Feel", text: "Thick enough to coat a spoon." },
    ]);
    expect(stepCues({})).toEqual([]);
  });

  it("keeps long cue text intact", () => {
    const long = "The sauce should look glossy and pull away from the sides ".repeat(4).trim();
    expect(stepCues({ cues: { visual: long } })[0].text).toBe(long);
  });
});

describe("readinessCheck", () => {
  it("prefers explicit completion guidance", () => {
    expect(
      readinessCheck({ completionNote: "No raw smell.", cues: { visual: "Oil on top." } }),
    ).toBe("No raw smell.");
  });
  it("falls back to the first sensory cue, then to nothing", () => {
    expect(readinessCheck({ cues: { aroma: "Toasty." } })).toBe("Toasty.");
    expect(readinessCheck({})).toBeNull();
  });
});

describe("demo recipe cues", () => {
  const recipe = recipeSchema.parse(seedJson);
  const session = startSession({ id: "s", recipe, servings: 4, now: 0, lineNames: new Map() });

  it("shows time and sensory guidance for the same step separately", () => {
    const d = stepDisplay(session, 1)!;
    expect(d.duration).toBe("10 min");
    expect(d.timerLabel).toBe("Simmer base");
    expect(d.cues.map((c) => c.label)).toEqual(["Look", "Smell"]);
    expect(d.completionNote).toBe("Base looks glossy, not watery.");
    expect(d.readinessCheck).toBe("Base looks glossy, not watery.");
  });

  it("shows nothing invented for a step without cues", () => {
    const d = stepDisplay(session, 0)!;
    expect(d.cues).toEqual([]);
    expect(d.completionNote).toBeNull();
    expect(d.safetyNote).toBeNull();
    expect(d.readinessCheck).toBeNull();
  });

  it("a finished timer leaves the step incomplete; the completion check still applies", () => {
    let s = applySessionTimer(session, "timer:demo-step-2", "start", 0);
    s = settleSessionTimers(s, 11 * 60_000).session;
    expect(s.timers[0].status).toBe("done");
    expect(s.completedStepIds).toEqual([]);
    expect(stepDisplay(s, 1)!.readinessCheck).toBe("Base looks glossy, not watery.");
  });

  it("feeds the recipe page tips from the structured cues", () => {
    const tips = deriveTips(recipe, new Map());
    expect(tips.filter((t) => t.type === "sensory").map((t) => t.title)).toEqual([
      "Step 2: look",
      "Step 2: smell",
    ]);
  });
});
