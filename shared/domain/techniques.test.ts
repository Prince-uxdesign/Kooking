import { describe, expect, it } from "vitest";
import { TECHNIQUES, techniquesFor } from "./techniques";

const ids = (instruction: string) => techniquesFor(instruction).map((t) => t.id);

describe("techniquesFor", () => {
  it("finds the technique a step calls for", () => {
    expect(
      ids("Add the tomato paste and fry it, stirring often, until it changes colour."),
    ).toEqual(["fry-tomato-paste"]);
    expect(ids("Fry, stirring every few minutes, until the oil rises to the top.")).toContain(
      "oil-rises",
    );
    expect(ids("Rinse the rice in a bowl of cold water, rubbing it between your hands.")).toEqual([
      "rinse-rice",
    ]);
  });

  it("orders matches by where they come up in the instruction", () => {
    expect(ids("Heat the palm oil for 2 minutes, then fry the sliced onion and iru.")).toEqual([
      "palm-oil",
      "soften-onions",
    ]);
  });

  it("ignores nouns and adjectives that only look like techniques", () => {
    expect(ids("Pour the blend into a pot.")).not.toContain("blend-pepper");
    expect(ids("Stir in the reduced pepper base.")).not.toContain("reduce");
    // "Don't stir" in egusi is about lumps, not steaming rice.
    expect(ids("Drop the egusi paste in. Don't stir. Cover and cook on low.")).toEqual([
      "egusi-lumps",
    ]);
    // Sugar, not salt: no salt advice on a drink.
    expect(ids("Stir in the sugar until dissolved, taste and adjust.")).toEqual([]);
  });

  it("caps the help at three techniques", () => {
    const busy =
      "Rinse the rice. Blend the peppers. Fry the onion until soft. Add the tomato paste. Simmer.";
    expect(techniquesFor(busy)).toHaveLength(3);
  });

  it("gives every technique steps, signs and a unique id", () => {
    const seen = new Set<string>();
    for (const t of TECHNIQUES) {
      expect(seen.has(t.id)).toBe(false);
      seen.add(t.id);
      expect(t.how.length).toBeGreaterThan(0);
      expect(t.signs.length).toBeGreaterThan(0);
      expect(t.why.length).toBeGreaterThan(0);
    }
  });
});
