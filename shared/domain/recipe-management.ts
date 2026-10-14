import {
  canTransition,
  recipeSchema,
  type Recipe,
  type RecipeCategory,
  type RecipeDifficulty,
  type RecipeEquipment,
  type RecipeIngredient,
  type RecipeStatus,
  type RecipeStep,
  type StatusChange,
} from "./recipe-schema";

export type EditorialRole = "admin" | "editor" | "chef" | "viewer";

export type EditorialAction =
  "create" | "edit" | "review" | "record_test" | "approve" | "publish" | "delete";

export interface EditorialContext {
  userId: string;
  userName?: string;
  role: EditorialRole;
}

export class EditorialAuthorizationError extends Error {
  constructor(
    public readonly action: EditorialAction,
    public readonly role: EditorialRole,
    message?: string,
  ) {
    super(
      message ??
        `Role '${role}' is not authorized to perform action '${action}' on recipe content.`,
    );
    this.name = "EditorialAuthorizationError";
  }
}

/**
 * Role-Based Permissions Matrix:
 * - admin: complete editorial and publishing authority.
 * - editor: content formulation, editorial review, and recipe approval.
 * - chef: culinary authoring and kitchen testing verification.
 * - viewer: read-only access (anonymous/ordinary users).
 */
const ROLE_PERMISSIONS: Record<EditorialRole, Set<EditorialAction>> = {
  admin: new Set(["create", "edit", "review", "record_test", "approve", "publish", "delete"]),
  editor: new Set(["create", "edit", "review", "record_test", "approve"]),
  chef: new Set(["create", "edit", "record_test"]),
  viewer: new Set([]),
};

export function isAuthorized(context: EditorialContext, action: EditorialAction): boolean {
  const allowed = ROLE_PERMISSIONS[context.role];
  return allowed ? allowed.has(action) : false;
}

export function assertAuthorized(context: EditorialContext, action: EditorialAction): void {
  if (!isAuthorized(context, action)) {
    throw new EditorialAuthorizationError(action, context.role);
  }
}

export interface RecipeDraftInput {
  id?: string;
  slug?: string;
  title: string;
  description?: string;
  categories: RecipeCategory[];
  baseServings: number;
  timeMinutes: { prep: number; cook: number; total: number };
  difficulty?: RecipeDifficulty;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  equipment?: RecipeEquipment[];
  tags?: string[];
  notes?: string[];
  demo?: boolean;
  source?: string;
  author?: string;
}

export interface RecipeUpdateInput {
  title?: string;
  description?: string;
  categories?: RecipeCategory[];
  baseServings?: number;
  timeMinutes?: { prep: number; cook: number; total: number };
  difficulty?: RecipeDifficulty;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  equipment?: RecipeEquipment[];
  tags?: string[];
  notes?: string[];
  source?: string;
  author?: string;
}

export interface StatusTransitionMetadata {
  by?: string;
  notes?: string;
  testedBy?: string;
  reviewNotes?: string;
}

export interface PublicationValidationResult {
  ready: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a recipe against strict publication readiness criteria.
 * Distinguishes schema validity from production publishing readiness.
 */
export function validatePublicationReadiness(recipe: Recipe): PublicationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Basic schema parse
  const parseResult = recipeSchema.safeParse(recipe);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      const path = issue.path.length > 0 ? `[${issue.path.join(".")}] ` : "";
      errors.push(`${path}${issue.message}`);
    }
  }

  // 2. Demo content guard — Demo recipes must never be published as authentic
  if (recipe.demo) {
    errors.push("Demo recipes cannot be published. Replace with authentic chef-validated content.");
  }

  // 3. Title & description depth
  if (!recipe.title || recipe.title.trim().length < 3) {
    errors.push("Recipe title must be at least 3 characters.");
  }
  if (!recipe.description || recipe.description.trim().length < 15) {
    errors.push("Published recipes require a descriptive summary (minimum 15 characters).");
  }

  // 4. Time validity
  if (recipe.timeMinutes.total !== recipe.timeMinutes.prep + recipe.timeMinutes.cook) {
    errors.push(
      `Time calculation mismatch: total (${recipe.timeMinutes.total}) must equal prep (${recipe.timeMinutes.prep}) + cook (${recipe.timeMinutes.cook}).`,
    );
  }

  // 5. Serving count
  if (recipe.baseServings <= 0 || recipe.baseServings > 24) {
    errors.push("Base servings must be between 1 and 24.");
  }

  // 6. Ingredients
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    errors.push("Recipe must contain at least one ingredient line.");
  } else {
    for (const line of recipe.ingredients) {
      if (line.scaling !== "to-taste" && line.quantity === null) {
        errors.push(`Ingredient '${line.id}' has scaling '${line.scaling}' but missing quantity.`);
      }
      if (line.quantity !== null && !line.unit) {
        errors.push(`Ingredient '${line.id}' has quantity but missing unit.`);
      }
      if (line.role === "substitutable" && (!line.substitutes || line.substitutes.length === 0)) {
        errors.push(`Substitutable ingredient '${line.id}' must specify approved substitutes.`);
      }
    }
  }

  // 7. Cooking steps
  if (!recipe.steps || recipe.steps.length === 0) {
    errors.push("Recipe must contain at least one ordered cooking step.");
  } else {
    const lineIds = new Set(recipe.ingredients.map((i) => i.id));
    recipe.steps.forEach((step, idx) => {
      if (step.order !== idx + 1) {
        errors.push(
          `Step orders must be contiguous starting from 1 (step ${step.id} has order ${step.order}).`,
        );
      }
      if (!step.instruction || step.instruction.trim().length < 5) {
        errors.push(`Step ${step.order} instruction is too brief (minimum 5 characters).`);
      }
      for (const ingId of step.ingredientIds) {
        if (!lineIds.has(ingId)) {
          errors.push(`Step ${step.order} references unknown ingredient '${ingId}'.`);
        }
      }
    });
  }

  // 8. Kitchen Validation (testedBy)
  if (!recipe.testedBy || recipe.testedBy.trim().length === 0) {
    errors.push(
      "Recipe cannot be published without verifiable kitchen tester attribution (testedBy).",
    );
  }

  // 9. Timestamps
  if (!recipe.createdAt) {
    errors.push("Published recipes must have an established createdAt ISO timestamp.");
  }

  // 10. Editorial Warnings (non-blocking suggestions)
  if (!recipe.image) {
    warnings.push("Recipe has no main image; fallback artwork will be displayed.");
  }
  if (!recipe.difficulty) {
    warnings.push("Recipe difficulty effort level has not been assessed.");
  }

  return {
    ready: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Creates a new recipe in 'draft' status with initial provenance.
 */
export function createDraftRecipe(input: RecipeDraftInput, context: EditorialContext): Recipe {
  assertAuthorized(context, "create");

  const now = new Date().toISOString();
  const slug =
    input.slug ??
    input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const id = input.id ?? `recipe-${slug}-${Date.now().toString(36)}`;

  const initialStatusChange: StatusChange = {
    fromStatus: "draft",
    toStatus: "draft",
    timestamp: now,
    by: context.userName ?? context.userId,
    notes: "Initial draft created.",
  };

  const draft: Recipe = {
    id,
    slug,
    title: input.title,
    description: input.description,
    categories: input.categories,
    baseServings: input.baseServings,
    timeMinutes: input.timeMinutes,
    difficulty: input.difficulty,
    ingredients: input.ingredients,
    steps: input.steps,
    equipment: input.equipment ?? [],
    tags: input.tags ?? [],
    notes: input.notes ?? [],
    contentVersion: 1,
    status: "draft",
    demo: input.demo ?? false,
    provenance: {
      source: input.source,
      author: input.author ?? context.userName ?? context.userId,
      statusHistory: [initialStatusChange],
    },
    createdAt: now,
    updatedAt: now,
  };

  return recipeSchema.parse(draft);
}

/**
 * Updates an existing recipe's content while preserving IDs and immutability rules.
 * Automatically increments contentVersion and records updatedAt.
 */
export function updateRecipeContent(
  recipe: Recipe,
  updates: RecipeUpdateInput,
  context: EditorialContext,
): Recipe {
  assertAuthorized(context, "edit");

  if (recipe.status === "published") {
    throw new Error(
      "Published recipes cannot be edited directly in-place. Transition status back to 'in_review' first to revise.",
    );
  }

  const now = new Date().toISOString();

  const updated: Recipe = {
    ...recipe,
    title: updates.title ?? recipe.title,
    description: updates.description ?? recipe.description,
    categories: updates.categories ?? recipe.categories,
    baseServings: updates.baseServings ?? recipe.baseServings,
    timeMinutes: updates.timeMinutes ?? recipe.timeMinutes,
    difficulty: updates.difficulty ?? recipe.difficulty,
    ingredients: updates.ingredients ?? recipe.ingredients,
    steps: updates.steps ?? recipe.steps,
    equipment: updates.equipment ?? recipe.equipment,
    tags: updates.tags ?? recipe.tags,
    notes: updates.notes ?? recipe.notes,
    contentVersion: recipe.contentVersion + 1,
    updatedAt: now,
    provenance: {
      ...recipe.provenance,
      source: updates.source ?? recipe.provenance?.source,
      author: updates.author ?? recipe.provenance?.author,
    },
  };

  return recipeSchema.parse(updated);
}

/**
 * Transitions a recipe across lifecycle stages with explicit validation and audit trail.
 */
export function transitionRecipeStatus(
  recipe: Recipe,
  newStatus: RecipeStatus,
  context: EditorialContext,
  metadata?: StatusTransitionMetadata,
): Recipe {
  const currentStatus = recipe.status;

  if (currentStatus === newStatus) {
    return recipe;
  }

  // 1. Verify valid state machine transition
  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid recipe lifecycle transition from '${currentStatus}' to '${newStatus}'.`,
    );
  }

  // 2. Authorization per transition
  switch (newStatus) {
    case "in_review":
      assertAuthorized(context, "edit");
      break;
    case "tested":
      assertAuthorized(context, "record_test");
      break;
    case "approved":
      assertAuthorized(context, "approve");
      break;
    case "published":
      assertAuthorized(context, "publish");
      break;
    case "draft":
      assertAuthorized(context, "edit");
      break;
  }

  // 3. Stage-specific integrity checks
  const now = new Date().toISOString();
  let testedBy = recipe.testedBy;

  if (newStatus === "tested") {
    testedBy = metadata?.testedBy ?? context.userName ?? context.userId;
    if (recipe.demo) {
      throw new Error(
        "Demo content cannot be marked as tested. Replace with authentic recipe data.",
      );
    }
    if (!testedBy || testedBy.trim().length === 0) {
      throw new Error("Transition to 'tested' requires tester identification (testedBy).");
    }
  }

  if (newStatus === "approved") {
    if (!recipe.testedBy && !metadata?.testedBy) {
      throw new Error("Recipe must be kitchen tested before it can be approved.");
    }
    if (recipe.demo) {
      throw new Error("Demo content cannot be approved for publication.");
    }
  }

  if (newStatus === "published") {
    const pubCheck = validatePublicationReadiness({
      ...recipe,
      status: "published",
      testedBy: testedBy ?? recipe.testedBy,
      createdAt: recipe.createdAt ?? now,
    });
    if (!pubCheck.ready) {
      throw new Error(
        `Cannot publish recipe due to validation failures:\n- ${pubCheck.errors.join("\n- ")}`,
      );
    }
  }

  // 4. Record audit history
  const historyEntry: StatusChange = {
    fromStatus: currentStatus,
    toStatus: newStatus,
    timestamp: now,
    by: metadata?.by ?? context.userName ?? context.userId,
    notes: metadata?.notes,
  };

  const nextHistory = [...(recipe.provenance?.statusHistory ?? []), historyEntry];

  const updated: Recipe = {
    ...recipe,
    status: newStatus,
    testedBy: testedBy ?? recipe.testedBy,
    updatedAt: now,
    createdAt: recipe.createdAt ?? (newStatus === "published" ? now : undefined),
    provenance: {
      ...recipe.provenance,
      reviewedBy:
        newStatus === "approved" || newStatus === "published"
          ? (metadata?.by ?? context.userName ?? context.userId)
          : recipe.provenance?.reviewedBy,
      reviewNotes: metadata?.reviewNotes ?? recipe.provenance?.reviewNotes,
      statusHistory: nextHistory,
    },
  };

  return recipeSchema.parse(updated);
}

/**
 * Evaluates impact of an upcoming recipe update on existing sessions and saved lists.
 */
export function checkRecipeEditImpact(
  recipe: Recipe,
  savedCooksCount: number = 0,
  activeSessionsCount: number = 0,
): {
  recipeId: string;
  currentVersion: number;
  nextVersion: number;
  savedCooksAffected: number;
  activeSessionsProtected: number;
  policySummary: string;
} {
  return {
    recipeId: recipe.id,
    currentVersion: recipe.contentVersion,
    nextVersion: recipe.contentVersion + 1,
    savedCooksAffected: savedCooksCount,
    activeSessionsProtected: activeSessionsCount,
    policySummary:
      "Active cooking sessions snapshot recipe lines and timers at start time. Edits do not disrupt live cooking.",
  };
}
