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
});

export type ReusableIngredient = z.infer<typeof reusableIngredientSchema>;

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

export const recipeStepSchema = z.object({
  id: idSchema,
  order: z.number().int().min(1),
  instruction: z.string().min(1).max(2000),
  ingredientIds: z.array(idSchema).max(20).default([]),
  preparationNotes: z.string().max(500).optional(),
  heat: z.enum(heatLevels).optional(),
  estimatedMinutes: z.number().positive().max(1440).optional(),
  timer: timerConfigSchema.optional(),
  sensoryCue: z.string().max(300).optional(),
  completionNote: z.string().max(300).optional(),
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

export const recipeStatus = ["draft", "in_review", "tested", "approved", "published"] as const;

export type RecipeStatus = (typeof recipeStatus)[number];

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
    ingredients: z.array(recipeIngredientSchema).min(1).max(60),
    steps: z.array(recipeStepSchema).min(1).max(60),
    contentVersion: z.number().int().min(1),
    status: z.enum(recipeStatus),
    /** Demo/seed content. Can never be published; trivially replaceable. */
    demo: z.boolean().default(false),
    /** Who tested it. Required once past review — never fabricated. */
    testedBy: z.string().min(1).max(120).optional(),
  })
  .superRefine((recipe, ctx) => {
    const lineIds = new Set(recipe.ingredients.map((i) => i.id));
    if (lineIds.size !== recipe.ingredients.length) {
      ctx.addIssue({ code: "custom", message: "ingredient line ids must be unique" });
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
    for (const step of recipe.steps) {
      for (const ref of step.ingredientIds) {
        if (!lineIds.has(ref)) {
          ctx.addIssue({
            code: "custom",
            message: `step ${step.order} references unknown ingredient line '${ref}'`,
          });
        }
      }
    }
    if (recipe.demo && recipe.status === "published") {
      ctx.addIssue({ code: "custom", message: "demo content can never be published" });
    }
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
  });

export type Recipe = z.infer<typeof recipeSchema>;
