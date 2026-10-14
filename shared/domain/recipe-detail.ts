import type { Recipe } from "./recipe-schema";
import type { ScaledLine } from "./scaling";

export type EquipmentIconType =
  "pot" | "utensils" | "knife" | "colander" | "flame" | "timer" | "scale";

export interface EquipmentItem {
  id: string;
  name: string;
  note: string;
  iconType: EquipmentIconType;
}

export type PrepGroupCategory =
  "wash-drain" | "chop-slice" | "blend-grind" | "measure-prep" | "other";

export interface PrepItem {
  id: string;
  lineId?: string;
  ingredientId?: string;
  ingredientName?: string;
  preparationState?: string;
  quantity?: number | null;
  unit?: string | null;
  displayQuantity?: string;
  instruction: string;
  detail?: string;
  stepOrders: number[];
  stepTimingAdvice?: string;
  group: PrepGroupCategory;
  groupLabel: string;
}

export interface PrepGroup {
  category: PrepGroupCategory;
  label: string;
  items: PrepItem[];
}

export interface RecipeTip {
  title: string;
  text: string;
  type: "sensory" | "technique" | "substitute";
}

/**
 * Derives required equipment honestly from recipe steps, heat levels,
 * timers, and ingredient prep requirements.
 */
export function deriveEquipment(recipe: Recipe): EquipmentItem[] {
  const items: EquipmentItem[] = [];

  // Heat source
  const hasHeat = recipe.steps.some((s) => s.heat !== undefined);
  if (hasHeat) {
    items.push({
      id: "cooktop",
      name: "Stovetop / Cooktop",
      note: "Controllable burner for simmering and steaming",
      iconType: "flame",
    });
  }

  // Primary pot or pan
  const mentionsPot = recipe.steps.some((s) =>
    /\b(pot|pan|skillet|dutch oven|saucepan)\b/i.test(s.instruction),
  );
  const isRiceOrStew = recipe.categories.some((c) =>
    ["rice", "stews-soups", "swallow", "beans-legumes"].includes(c),
  );
  if (mentionsPot || isRiceOrStew) {
    items.push({
      id: "pot",
      name: "Cooking pot with tight lid",
      note: "Heavy base prevents scorching; tight lid traps steam",
      iconType: "pot",
    });
  }

  // Colander / rinsing tool
  const needsRinse =
    recipe.ingredients.some((i) => i.preparation?.toLowerCase().includes("rinse")) ||
    recipe.steps.some((s) => /\b(rinse|drain|wash)\b/i.test(s.instruction));
  if (needsRinse) {
    items.push({
      id: "colander",
      name: "Colander or fine sieve",
      note: "For washing grains and draining excess water",
      iconType: "colander",
    });
  }

  // Stirring utensil
  const needsStir = recipe.steps.some((s) => /\b(stir|fold|mix|whisk)\b/i.test(s.instruction));
  if (needsStir) {
    items.push({
      id: "spoon",
      name: "Wooden spoon or heatproof spatula",
      note: "For stirring bases without scratching cookware",
      iconType: "utensils",
    });
  }

  // Cutting board & knife
  const needsKnife =
    recipe.ingredients.some(
      (i) => i.preparation && /\b(diced|chopped|sliced|peeled|cut|minced)\b/i.test(i.preparation),
    ) || recipe.steps.some((s) => /\b(chop|dice|slice|cut|peel)\b/i.test(s.instruction));
  if (needsKnife) {
    items.push({
      id: "knife",
      name: "Chef's knife & prep board",
      note: "For trimming, peeling, and cutting ingredients",
      iconType: "knife",
    });
  }

  // Timer
  const hasTimer = recipe.steps.some((s) => s.timer !== undefined);
  if (hasTimer) {
    items.push({
      id: "timer",
      name: "Kitchen timer",
      note: "For tracking active simmer and reduction intervals",
      iconType: "timer",
    });
  }

  // Incorporate explicit equipment defined in structured recipe data
  if (recipe.equipment && recipe.equipment.length > 0) {
    for (const eq of recipe.equipment) {
      const existing = items.find((i) => i.id === eq.id);
      if (existing) {
        if (eq.notes) existing.note = eq.notes;
        if (eq.name) existing.name = eq.name;
      } else {
        const iconType: EquipmentIconType =
          eq.id.includes("pot") || eq.id.includes("pan")
            ? "pot"
            : eq.id.includes("knife")
              ? "knife"
              : eq.id.includes("colander") || eq.id.includes("sieve")
                ? "colander"
                : eq.id.includes("spoon") || eq.id.includes("spatula")
                  ? "utensils"
                  : eq.id.includes("timer")
                    ? "timer"
                    : eq.id.includes("flame") || eq.id.includes("cooktop")
                      ? "flame"
                      : "utensils";

        items.push({
          id: eq.id,
          name: eq.name,
          note: eq.notes ?? "Essential cookware for this recipe",
          iconType,
        });
      }
    }
  }

  return items;
}

/**
 * Extracts clear pre-cooking preparation requirements so cooks
 * know what mise en place to complete before lighting the stove.
 */
export function derivePreparation(
  recipe: Recipe,
  ingredientNames: Map<string, string>,
  scaledLines?: ScaledLine[],
): PrepItem[] {
  const items: PrepItem[] = [];

  // Ingredient-level preparation directives
  recipe.ingredients.forEach((line) => {
    if (line.preparation) {
      const name = ingredientNames.get(line.ingredientId) ?? line.ingredientId;
      const scaled = scaledLines?.find((l) => l.id === line.id);
      const stepOrders = recipe.steps
        .filter((s) => s.ingredientIds.includes(line.id))
        .map((s) => s.order)
        .sort((a, b) => a - b);

      const stepTimingAdvice =
        stepOrders.length === 1
          ? `Needed in Step ${stepOrders[0]}`
          : stepOrders.length > 1
            ? `Needed in Step ${stepOrders[0]} (also used in Step ${stepOrders.slice(1).join(", ")})`
            : undefined;

      const prepLower = line.preparation.toLowerCase();
      let group: PrepGroupCategory = "other";
      let groupLabel = "Other Preparation";

      if (/\b(rinse|rinsed|wash|washed|soak|soaked|drain|drained)\b/.test(prepLower)) {
        group = "wash-drain";
        groupLabel = "Wash, Soak & Drain";
      } else if (
        /\b(chop|chopped|slice|sliced|dice|diced|mince|minced|cut|peel|peeled|grate|grated|shred|shredded|julienne)\b/.test(
          prepLower,
        )
      ) {
        group = "chop-slice";
        groupLabel = "Chop, Slice & Grate";
      } else if (
        /\b(blend|blended|grind|ground|puree|purée|pound|pounded|crush|crushed|mill|milled)\b/.test(
          prepLower,
        )
      ) {
        group = "blend-grind";
        groupLabel = "Blend, Grind & Puree";
      } else if (
        /\b(measure|measured|season|seasoned|marinate|marinated|whisk|whisked|mix|mixed|sift|sifted|separate|separated|dissolve|dissolved)\b/.test(
          prepLower,
        )
      ) {
        group = "measure-prep";
        groupLabel = "Measure & Season";
      }

      items.push({
        id: `prep:${line.id}`,
        lineId: line.id,
        ingredientId: line.ingredientId,
        ingredientName: name,
        preparationState: line.preparation,
        quantity: scaled?.scaledQuantity ?? line.quantity,
        unit: line.unit,
        displayQuantity: scaled?.displayQuantity,
        instruction: `${name}: ${line.preparation}`,
        detail:
          [line.note, line.constraint ? `Constraint: ${line.constraint}` : null]
            .filter(Boolean)
            .join(" • ") || undefined,
        stepOrders,
        stepTimingAdvice,
        group,
        groupLabel,
      });
    }
  });

  // Step-level preparation notes
  recipe.steps.forEach((step) => {
    if (step.preparationNotes) {
      const noteLower = step.preparationNotes.toLowerCase();
      let group: PrepGroupCategory = "other";
      let groupLabel = "Other Preparation";

      if (/\b(rinse|wash|soak|drain)\b/.test(noteLower)) {
        group = "wash-drain";
        groupLabel = "Wash, Soak & Drain";
      } else if (/\b(chop|slice|dice|mince|cut|peel|grate)\b/.test(noteLower)) {
        group = "chop-slice";
        groupLabel = "Chop, Slice & Grate";
      } else if (/\b(blend|grind|puree|purée|pound|crush)\b/.test(noteLower)) {
        group = "blend-grind";
        groupLabel = "Blend, Grind & Puree";
      } else if (/\b(measure|season|marinate|whisk|mix|sift|separate)\b/.test(noteLower)) {
        group = "measure-prep";
        groupLabel = "Measure & Season";
      }

      items.push({
        id: `step-prep:${step.id}`,
        instruction: step.preparationNotes,
        stepOrders: [step.order],
        stepTimingAdvice: `For Step ${step.order}`,
        group,
        groupLabel,
      });
    }
  });

  return items;
}

/**
 * Organizes preparation items into distinct culinary mise en place groups.
 * Only returns groups that have at least one active item (no phantom sections).
 */
export function groupPreparationItems(items: PrepItem[]): PrepGroup[] {
  const groupsOrder: PrepGroupCategory[] = [
    "wash-drain",
    "chop-slice",
    "blend-grind",
    "measure-prep",
    "other",
  ];

  const grouped = new Map<PrepGroupCategory, { label: string; items: PrepItem[] }>();

  for (const item of items) {
    if (!grouped.has(item.group)) {
      grouped.set(item.group, { label: item.groupLabel, items: [] });
    }
    grouped.get(item.group)!.items.push(item);
  }

  const result: PrepGroup[] = [];
  for (const cat of groupsOrder) {
    const entry = grouped.get(cat);
    if (entry && entry.items.length > 0) {
      result.push({
        category: cat,
        label: entry.label,
        items: entry.items,
      });
    }
  }

  return result;
}

/**
 * Extracts helpful sensory cues, completion signs, and ingredient notes.
 */
export function deriveTips(recipe: Recipe, ingredientNames: Map<string, string>): RecipeTip[] {
  const tips: RecipeTip[] = [];

  // Step sensory cues and completion notes
  recipe.steps.forEach((step) => {
    if (step.sensoryCue) {
      tips.push({
        title: `Step ${step.order} cue`,
        text: step.sensoryCue,
        type: "sensory",
      });
    }
    if (step.completionNote) {
      tips.push({
        title: `Step ${step.order} done sign`,
        text: step.completionNote,
        type: "technique",
      });
    }
  });

  // Substitutions
  recipe.ingredients.forEach((line) => {
    if (line.role === "substitutable" && (line.substitutes ?? []).length > 0) {
      const name = ingredientNames.get(line.ingredientId) ?? line.ingredientId;
      const subNames = (line.substitutes ?? [])
        .map((id) => ingredientNames.get(id) ?? id)
        .join(", ");
      tips.push({
        title: `${name} swaps`,
        text: `Can be substituted with ${subNames}.`,
        type: "substitute",
      });
    }
  });

  // Recipe-level chef notes
  if (recipe.notes) {
    recipe.notes.forEach((note, idx) => {
      tips.push({
        title: `Chef Note ${idx + 1}`,
        text: note,
        type: "technique",
      });
    });
  }

  return tips;
}
