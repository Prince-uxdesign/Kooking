import { describe, expect, it } from "vitest";
import seedJson from "@/content/seed/demo-tomato-rice.json";
import { recipeSchema, type Recipe } from "./recipe-schema";
import {
  deriveEquipment,
  derivePreparation,
  deriveTips,
  groupPreparationItems,
} from "./recipe-detail";
import { scaleRecipe } from "./scaling";

const demoRecipe: Recipe = recipeSchema.parse(seedJson);

const demoNames = new Map([
  ["demo:long-grain-rice", "Long-grain rice"],
  ["demo:tomato-paste", "Tomato paste"],
  ["demo:tomato-puree", "Tomato purée"],
  ["demo:salt", "Salt"],
  ["demo:plantain", "Plantain"],
]);

describe("deriveEquipment", () => {
  it("derives stovetop, pot, colander, spoon, and timer from demo recipe", () => {
    const equipment = deriveEquipment(demoRecipe);
    const ids = equipment.map((e) => e.id);

    expect(ids).toContain("cooktop");
    expect(ids).toContain("pot");
    expect(ids).toContain("colander");
    expect(ids).toContain("spoon");
    expect(ids).toContain("timer");
  });

  it("handles minimal recipe without timers or heat gracefully", () => {
    const minimal: Recipe = {
      ...demoRecipe,
      steps: [
        {
          id: "step-1",
          order: 1,
          instruction: "Combine all ingredients in a bowl.",
          ingredientIds: [],
        },
      ],
      categories: ["snacks"],
    };

    const equipment = deriveEquipment(minimal);
    const ids = equipment.map((e) => e.id);
    expect(ids).not.toContain("cooktop");
    expect(ids).not.toContain("timer");
  });
});

describe("derivePreparation", () => {
  it("extracts ingredient-level and step-level prep requirements", () => {
    const prep = derivePreparation(demoRecipe, demoNames);
    expect(prep.length).toBeGreaterThan(0);

    const instructions = prep.map((p) => p.instruction);
    expect(instructions.some((i) => i.includes("Long-grain rice: rinsed"))).toBe(true);
  });

  it("updates quantities when scaledLines are provided", () => {
    const scaledLines = scaleRecipe(demoRecipe, 8);

    const prep = derivePreparation(demoRecipe, demoNames, scaledLines);
    const ricePrep = prep.find((p) => p.lineId === "demo-rice");
    expect(ricePrep).toBeDefined();
    expect(ricePrep?.quantity).toBe(800);
    expect(ricePrep?.displayQuantity).toBe("800 g");
  });

  it("ignores ingredients without preparation instructions", () => {
    const noPrepRecipe: Recipe = {
      ...demoRecipe,
      ingredients: [
        {
          id: "line-noprep",
          ingredientId: "demo:salt",
          quantity: 5,
          unit: "g",
          role: "required",
          scaling: "linear",
          // no preparation attribute
        },
      ],
      steps: [
        {
          id: "step-1",
          order: 1,
          instruction: "Add salt to water.",
          ingredientIds: ["line-noprep"],
        },
      ],
    };

    const prep = derivePreparation(noPrepRecipe, demoNames);
    expect(prep.length).toBe(0);
  });

  it("consolidates multi-step ingredient references into a single prep item with timing advice", () => {
    const multiStepRecipe: Recipe = {
      ...demoRecipe,
      ingredients: [
        {
          id: "line-onion",
          ingredientId: "demo:onion",
          quantity: 2,
          unit: "piece",
          role: "required",
          scaling: "discrete",
          preparation: "chopped finely",
        },
      ],
      steps: [
        {
          id: "step-1",
          order: 1,
          instruction: "Sauté half of the onions.",
          ingredientIds: ["line-onion"],
        },
        {
          id: "step-3",
          order: 3,
          instruction: "Stir in remaining onions.",
          ingredientIds: ["line-onion"],
        },
      ],
    };

    const prep = derivePreparation(multiStepRecipe, new Map([["demo:onion", "Yellow Onion"]]));
    expect(prep.length).toBe(1);
    expect(prep[0].ingredientName).toBe("Yellow Onion");
    expect(prep[0].stepOrders).toEqual([1, 3]);
    expect(prep[0].stepTimingAdvice).toContain("Step 1");
    expect(prep[0].stepTimingAdvice).toContain("Step 3");
  });
});

describe("groupPreparationItems", () => {
  it("groups prep items by culinary action and omits empty categories", () => {
    const testRecipe: Recipe = {
      ...demoRecipe,
      ingredients: [
        {
          id: "l1",
          ingredientId: "i1",
          quantity: 100,
          unit: "g",
          scaling: "linear",
          role: "required",
          preparation: "washed and soaked",
        },
        {
          id: "l2",
          ingredientId: "i2",
          quantity: 100,
          unit: "g",
          scaling: "linear",
          role: "required",
          preparation: "sliced thinly",
        },
        {
          id: "l3",
          ingredientId: "i3",
          quantity: 100,
          unit: "g",
          scaling: "linear",
          role: "required",
          preparation: "blended smooth",
        },
        {
          id: "l4",
          ingredientId: "i4",
          quantity: 100,
          unit: "g",
          scaling: "linear",
          role: "required",
          preparation: "measured and set aside",
        },
      ],
      steps: [],
    };

    const prep = derivePreparation(testRecipe, new Map());
    const groups = groupPreparationItems(prep);

    expect(groups.length).toBe(4);
    expect(groups.map((g) => g.category)).toEqual([
      "wash-drain",
      "chop-slice",
      "blend-grind",
      "measure-prep",
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Wash, Soak & Drain",
      "Chop, Slice & Grate",
      "Blend, Grind & Puree",
      "Measure & Season",
    ]);
  });

  it("does not create groups when there are no prep items", () => {
    const groups = groupPreparationItems([]);
    expect(groups).toEqual([]);
  });
});

describe("deriveTips", () => {
  it("extracts sensory cues, completion signs, and ingredient swaps", () => {
    const tips = deriveTips(demoRecipe, demoNames);
    expect(tips.length).toBeGreaterThan(0);

    const texts = tips.map((t) => t.text);
    expect(texts.some((t) => t.includes("Oil gathers at the edges"))).toBe(true);
    expect(texts.some((t) => t.includes("Grains separate and stand"))).toBe(true);
    expect(texts.some((t) => t.includes("Tomato purée"))).toBe(true);
  });
});
