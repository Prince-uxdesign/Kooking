import { z } from "zod";
import { SCALING_BEHAVIORS, UNITS, isValidAmount } from "./units";

/**
 * Recipe content schemas (Zod). Every external content payload —
 * seed JSON today, chef CMS tomorrow — parses through here and
 * fails closed. Inferred TS types are the domain types.
 */

const idSchema = z.string().min(1).max(100);
const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase alphanumeric with dashes")
  .refine((slug) => !(RESERVED_RECIPE_SLUGS as readonly string[]).includes(slug), {
    message: "slug is reserved for an Explore route",
  });

const amountSchema = z.number().refine(isValidAmount, {
  message: "amount must be a finite number > 0 and <= 1_000_000",
});

const unitSchema = z.enum(UNITS);

export const ingredientRoles = ["required", "optional", "substitutable", "garnish"] as const;

export type IngredientRole = (typeof ingredientRoles)[number];

/** Reusable ingredient — the pantry-level catalog entry. */
export const reusableIngredientSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60).optional(),
  defaultUnit: unitSchema.optional(),
  notes: z.string().max(500).optional(),
  /** Other names cooks search by (e.g. local names). Search-only; never shown as a claim. */
  aliases: z.array(z.string().min(1).max(60)).max(10).default([]),
});

export type ReusableIngredient = z.infer<typeof reusableIngredientSchema>;

/**
 * One ingredient line as used by one recipe. References the catalog
 * by id; all recipe-specific behavior lives here.
 */
export const recipeEquipmentSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60).optional(),
  notes: z.string().max(300).optional(),
  optional: z.boolean().default(false),
});

export type RecipeEquipment = z.infer<typeof recipeEquipmentSchema>;

export const recipeStatus = ["draft", "in_review", "tested", "approved", "published"] as const;

export type RecipeStatus = (typeof recipeStatus)[number];

export const statusChangeSchema = z.object({
  fromStatus: z.enum(recipeStatus),
  toStatus: z.enum(recipeStatus),
  timestamp: z.string().datetime({ message: "timestamp must be an ISO 8601 string" }),
  by: z.string().min(1).max(120),
  notes: z.string().max(500).optional(),
});

export type StatusChange = z.infer<typeof statusChangeSchema>;

export const recipeProvenanceSchema = z.object({
  source: z.string().min(1).max(200).optional(),
  author: z.string().min(1).max(120).optional(),
  reviewedBy: z.string().min(1).max(120).optional(),
  reviewNotes: z.string().max(1000).optional(),
  license: z.string().max(100).optional(),
  statusHistory: z.array(statusChangeSchema).optional(),
});

export type RecipeProvenance = z.infer<typeof recipeProvenanceSchema>;

/**
 * One ingredient line as used by one recipe. References the catalog
 * by id; all recipe-specific behavior lives here.
 */
export const recipeIngredientSchema = z
  .object({
    id: idSchema.describe("line id, unique within the recipe"),
    ingredientId: idSchema.describe("reference into the ingredient catalog"),
    quantity: amountSchema.nullable(),
    unit: unitSchema.nullable(),
    preparation: z.string().max(120).optional(),
    role: z.enum(ingredientRoles),
    scaling: z.enum(SCALING_BEHAVIORS),
    substitutes: z.array(z.string().min(1).max(120)).max(8).optional(),
    note: z.string().max(500).optional(),
    constraint: z.string().max(300).optional(),
    garnishRequired: z
      .boolean()
      .optional()
      .describe("When role is garnish, set true if omission is forbidden"),
  })
  .superRefine((line, ctx) => {
    if (line.scaling === "to-taste" && line.quantity !== null) {
      ctx.addIssue({
        code: "custom",
        message: "to-taste lines must have quantity: null",
      });
    }
    if (line.scaling !== "to-taste" && line.scaling !== "manual" && line.quantity === null) {
      ctx.addIssue({
        code: "custom",
        message: "scaled lines need a quantity; use to-taste or manual instead",
      });
    }
    if (line.quantity !== null && line.unit === null) {
      ctx.addIssue({
        code: "custom",
        message: "a quantity without a unit cannot be scaled or shopped reliably",
      });
    }
    if (line.role === "substitutable" && (line.substitutes ?? []).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "substitutable lines need a chef-approved substitutes list",
      });
    }
    if (line.role !== "substitutable" && (line.substitutes ?? []).length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "only substitutable lines may carry substitutes",
      });
    }
    if (line.substitutes && line.substitutes.includes(line.ingredientId)) {
      ctx.addIssue({
        code: "custom",
        message: `substitute list cannot contain the ingredient itself ('${line.ingredientId}')`,
      });
    }
  });

export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

/** Timer configuration — present only on steps that genuinely need one. */
export const timerConfigSchema = z.object({
  durationSeconds: z
    .number()
    .int()
    .min(5, "timers under 5s are noise — fold into the instruction")
    .max(86_400),
  label: z.string().min(1).max(60).optional(),
});

export type TimerConfig = z.infer<typeof timerConfigSchema>;

export const heatLevels = ["low", "medium-low", "medium", "medium-high", "high"] as const;

const cueText = z.string().trim().min(1, "cue text can't be empty").max(300);

/**
 * Structured sensory cues for a step: what the cook should see, feel,
 * smell or hear. Every field is optional; unknown keys are rejected so a
 * typo can't silently drop a cue. `sensoryCue` remains for cues that
 * don't fit one sense.
 */
export const stepCuesSchema = z
  .object({
    visual: cueText.optional(),
    texture: cueText.optional(),
    aroma: cueText.optional(),
    sound: cueText.optional(),
  })
  .strict();

export type StepCues = z.infer<typeof stepCuesSchema>;

/**
 * Recipe photo. Optional — UI renders an honest fallback when absent
 * or when the file fails to load. Alt text is required: a photo
 * without a description is not accepted.
 */
export const recipeImageSchema = z.object({
  src: z
    .string()
    .min(1)
    .max(500)
    .regex(/^(\/(?!\/)|https:\/\/)/, "image src must be a site path or https URL"),
  alt: z.string().min(1).max(200),
});

export type RecipeImage = z.infer<typeof recipeImageSchema>;

export const recipeStepSchema = z.object({
  id: idSchema,
  order: z.number().int().min(1),
  instruction: z.string().trim().min(1, "instruction cannot be empty").max(2000),
  ingredientIds: z.array(idSchema).max(20).default([]),
  ingredientQuantities: z.record(z.string(), z.number().nullable()).optional(),
  preparationNotes: z.string().max(500).optional(),
  heat: z.enum(heatLevels).optional(),
  estimatedMinutes: z.number().positive().max(1440).optional(),
  timer: timerConfigSchema.optional(),
  /** A cue that doesn't belong to one sense. */
  sensoryCue: cueText.optional(),
  cues: stepCuesSchema.optional(),
  /**
   * What to check before moving on. Independent of `timer`: a timer is a
   * time cue, this is the doneness check.
   */
  completionNote: cueText.optional(),
  /** Safety-relevant warning for this step (hot oil, steam, raw meat…). */
  safetyNote: cueText.optional(),
  /** Photo of what this step looks like. Optional; absent means no photo, never a stand-in. */
  image: recipeImageSchema.optional(),
});

export type RecipeStep = z.infer<typeof recipeStepSchema>;

export const recipeCategories = [
  "rice",
  "stews-soups",
  "swallow",
  "breakfast",
  "beans-legumes",
  "plantain",
  "snacks",
  "sides",
  "grills",
  "drinks",
] as const;

export type RecipeCategory = (typeof recipeCategories)[number];

/**
 * Optional, content-assigned effort level. Never inferred from step
 * counts or time — absent means "not assessed", and UI shows nothing.
 */
export const recipeDifficulties = ["easy", "medium", "challenging"] as const;

export type RecipeDifficulty = (typeof recipeDifficulties)[number];

/** Path segments under /recipes that a recipe slug may never take. */
export const RESERVED_RECIPE_SLUGS = ["categories", "collections"] as const;

/** Allowed lifecycle transitions. No skipping review, no silent publish. */
export const STATUS_TRANSITIONS: Record<RecipeStatus, RecipeStatus[]> = {
  draft: ["in_review"],
  in_review: ["draft", "tested"],
  tested: ["in_review", "approved"],
  approved: ["published", "in_review"],
  published: ["in_review"],
};

export function canTransition(from: RecipeStatus, to: RecipeStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/**
 * True only when the lifecycle says so. UI must never render
 * "chef-tested" (or similar) unless this returns true.
 */
export function isChefTested(status: RecipeStatus): boolean {
  return status === "tested" || status === "approved" || status === "published";
}

export const recipeSchema = z
  .object({
    id: idSchema,
    slug: slugSchema,
    title: z.string().min(1).max(140),
    description: z.string().max(1000).optional(),
    image: recipeImageSchema.optional(),
    categories: z.array(z.enum(recipeCategories)).min(1).max(3),
    difficulty: z.enum(recipeDifficulties).optional(),
    tags: z
      .array(
        z
          .string()
          .min(1)
          .max(30)
          .regex(/^[a-z0-9-]+$/),
      )
      .max(10)
      .default([]),
    baseServings: z.number().int().min(1).max(24),
    timeMinutes: z
      .object({
        prep: z.number().min(0).max(1440),
        cook: z.number().min(0).max(1440),
        total: z.number().min(0).max(2880),
      })
      .refine((t) => t.total === t.prep + t.cook, {
        message: "total must equal prep + cook — derive, don't decorate",
      }),
    equipment: z.array(recipeEquipmentSchema).default([]),
    ingredients: z.array(recipeIngredientSchema).min(1).max(60),
    steps: z.array(recipeStepSchema).min(1).max(60),
    notes: z.array(z.string().min(1).max(500)).max(20).default([]),
    contentVersion: z.number().int().min(1),
    status: z.enum(recipeStatus),
    provenance: recipeProvenanceSchema.optional(),
    /** Demo/seed content. Can never be published; trivially replaceable. */
    demo: z.boolean().default(false),
    /** Who tested it. Required once past review — never fabricated. */
    testedBy: z.string().min(1).max(120).optional(),
    createdAt: z
      .string()
      .datetime({ message: "createdAt must be an ISO 8601 timestamp" })
      .optional(),
    updatedAt: z
      .string()
      .datetime({ message: "updatedAt must be an ISO 8601 timestamp" })
      .optional(),
  })
  .superRefine((recipe, ctx) => {
    const lineIds = new Set(recipe.ingredients.map((i) => i.id));
    if (lineIds.size !== recipe.ingredients.length) {
      ctx.addIssue({ code: "custom", message: "ingredient line ids must be unique" });
    }

    const eqIds = new Set(recipe.equipment.map((e) => e.id));
    if (eqIds.size !== recipe.equipment.length) {
      ctx.addIssue({ code: "custom", message: "equipment ids must be unique" });
    }

    const orders = recipe.steps.map((s) => s.order).sort((a, b) => a - b);
    orders.forEach((order, index) => {
      if (order !== index + 1) {
        ctx.addIssue({
          code: "custom",
          message: `step orders must be contiguous from 1 (found ${order} at position ${index + 1})`,
        });
      }
    });

    const stepIds = new Set(recipe.steps.map((s) => s.id));
    if (stepIds.size !== recipe.steps.length) {
      ctx.addIssue({ code: "custom", message: "step ids must be unique" });
    }

    // Per-step quantities say how much of a line *this step handles*. The
    // same line can be handled by several steps (rinse the rice, then add
    // it), so they are not shares that must sum — but none may exceed the
    // line's total, and each must belong to a line the step lists.
    for (const step of recipe.steps) {
      if (new Set(step.ingredientIds).size !== step.ingredientIds.length) {
        ctx.addIssue({
          code: "custom",
          message: `step ${step.order} lists the same ingredient line more than once`,
        });
      }
      for (const [ref, qty] of Object.entries(step.ingredientQuantities ?? {})) {
        if (!step.ingredientIds.includes(ref)) {
          ctx.addIssue({
            code: "custom",
            message: `step ${step.order} gives a quantity for '${ref}' but doesn't list it in ingredientIds`,
          });
        }
        const line = recipe.ingredients.find((i) => i.id === ref);
        if (line && typeof qty === "number") {
          if (line.quantity === null) {
            ctx.addIssue({
              code: "custom",
              message: `step ${step.order} gives a quantity for '${ref}', which has no quantity in the ingredient list`,
            });
          } else if (qty > line.quantity + 1e-9) {
            ctx.addIssue({
              code: "custom",
              message: `step ${step.order} uses ${qty} of '${ref}' but the recipe only has ${line.quantity}`,
            });
          }
        }
      }
    }

    for (const step of recipe.steps) {
      for (const ref of step.ingredientIds) {
        if (!lineIds.has(ref)) {
          ctx.addIssue({
            code: "custom",
            message: `step ${step.order} references unknown ingredient line '${ref}'`,
          });
        }
      }
      if (step.ingredientQuantities) {
        for (const [ref, qty] of Object.entries(step.ingredientQuantities)) {
          if (!lineIds.has(ref)) {
            ctx.addIssue({
              code: "custom",
              message: `step ${step.order} ingredientQuantities references unknown ingredient line '${ref}'`,
            });
          }
          if (qty !== null && (qty <= 0 || !Number.isFinite(qty))) {
            ctx.addIssue({
              code: "custom",
              message: `step ${step.order} ingredient quantity for '${ref}' must be a finite positive number or null`,
            });
          }
        }
      }
    }

    // Substitution integrity within the recipe
    for (const ingredient of recipe.ingredients) {
      if (ingredient.substitutes) {
        if (new Set(ingredient.substitutes).size !== ingredient.substitutes.length) {
          ctx.addIssue({
            code: "custom",
            message: `substitute list for ingredient line '${ingredient.id}' cannot contain duplicate references`,
          });
        }
        for (const sub of ingredient.substitutes) {
          if (!sub.trim()) {
            ctx.addIssue({
              code: "custom",
              message: `substitute in ingredient line '${ingredient.id}' cannot be empty or whitespace`,
            });
          }
          if (sub === ingredient.ingredientId || sub === ingredient.id) {
            ctx.addIssue({
              code: "custom",
              message: `ingredient line '${ingredient.id}' cannot list itself as a substitute`,
            });
          }
        }
      }
    }

    // Timestamp chronology
    if (recipe.createdAt && recipe.updatedAt) {
      if (new Date(recipe.updatedAt).getTime() < new Date(recipe.createdAt).getTime()) {
        ctx.addIssue({
          code: "custom",
          message: "updatedAt cannot be earlier than createdAt",
        });
      }
    }

    // Demo lifecycle honesty
    if (
      recipe.demo &&
      (recipe.status === "tested" || recipe.status === "approved" || recipe.status === "published")
    ) {
      ctx.addIssue({
        code: "custom",
        message: `demo content cannot be marked as '${recipe.status}' — must remain in draft or in_review`,
      });
    }

    // Status verification requirement
    if (
      (recipe.status === "tested" ||
        recipe.status === "approved" ||
        recipe.status === "published") &&
      !recipe.testedBy
    ) {
      ctx.addIssue({
        code: "custom",
        message: `status '${recipe.status}' requires testedBy`,
      });
    }

    // Publication integrity
    if (recipe.status === "published" && !recipe.createdAt) {
      ctx.addIssue({
        code: "custom",
        message: "published recipes must have a createdAt timestamp",
      });
    }
  });

export type Recipe = z.infer<typeof recipeSchema>;

/** Formats Zod errors into clean, readable strings. */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.issues.map((e) => {
    const path = e.path.length > 0 ? `[${e.path.join(".")}] ` : "";
    return `${path}${e.message}`;
  });
}

/** Parses raw data into a validated Recipe or returns formatted error messages. */
export function validateRecipe(
  raw: unknown,
): { success: true; data: Recipe } | { success: false; errors: string[] } {
  const result = recipeSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: formatValidationErrors(result.error) };
}

/**
 * Validates that all ingredient and substitute references in a recipe
 * exist within the provided reusable ingredient catalog.
 */
export function validateRecipeAgainstCatalog(
  recipe: Recipe,
  catalog: ReusableIngredient[] | Iterable<string> | Set<string>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const knownIds =
    catalog instanceof Set
      ? catalog
      : Array.isArray(catalog)
        ? new Set(catalog.map((i) => i.id))
        : new Set(catalog);

  for (const line of recipe.ingredients) {
    if (!knownIds.has(line.ingredientId)) {
      errors.push(
        `Ingredient '${line.ingredientId}' (line '${line.id}') does not exist in the ingredient catalog`,
      );
    }
    if (line.substitutes) {
      for (const sub of line.substitutes) {
        if (sub.includes(":") && !knownIds.has(sub)) {
          errors.push(
            `Substitute reference '${sub}' (for line '${line.id}') does not exist in the ingredient catalog`,
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
