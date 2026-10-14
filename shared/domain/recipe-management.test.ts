import { describe, expect, it } from "vitest";
import seedJson from "@/content/seed/demo-tomato-rice.json";
import { recipeSchema, type Recipe } from "./recipe-schema";
import {
  assertAuthorized,
  checkRecipeEditImpact,
  createDraftRecipe,
  EditorialAuthorizationError,
  isAuthorized,
  transitionRecipeStatus,
  updateRecipeContent,
  validatePublicationReadiness,
  type EditorialContext,
  type RecipeDraftInput,
} from "./recipe-management";

const seedRecipe: Recipe = recipeSchema.parse(seedJson);

const adminContext: EditorialContext = {
  userId: "admin-1",
  userName: "Adaeze (Lead Admin)",
  role: "admin",
};

const editorContext: EditorialContext = {
  userId: "editor-1",
  userName: "Emeka (Content Editor)",
  role: "editor",
};

const chefContext: EditorialContext = {
  userId: "chef-1",
  userName: "Chef Tunde (Culinary Partner)",
  role: "chef",
};

const viewerContext: EditorialContext = {
  userId: "user-1",
  userName: "Ordinary Visitor",
  role: "viewer",
};

const sampleDraftInput: RecipeDraftInput = {
  title: "Classic Jollof Rice",
  description:
    "Authentic Nigerian party-style jollof rice with rich tomato reduction and smoky finish.",
  categories: ["rice"],
  baseServings: 6,
  timeMinutes: { prep: 20, cook: 45, total: 65 },
  difficulty: "medium",
  demo: false,
  ingredients: [
    {
      id: "line-rice",
      ingredientId: "demo:long-grain-rice",
      quantity: 600,
      unit: "g",
      role: "required",
      scaling: "linear",
      preparation: "rinsed and drained",
    },
    {
      id: "line-paste",
      ingredientId: "demo:tomato-paste",
      quantity: 100,
      unit: "g",
      role: "substitutable",
      scaling: "linear",
      substitutes: ["demo:tomato-puree"],
    },
    {
      id: "line-salt",
      ingredientId: "demo:salt",
      quantity: null,
      unit: null,
      role: "optional",
      scaling: "to-taste",
    },
  ],
  steps: [
    {
      id: "step-1",
      order: 1,
      instruction: "Fry tomato paste in vegetable oil until deep crimson and raw aroma dissipates.",
      ingredientIds: ["line-paste"],
      heat: "medium",
      timer: { durationSeconds: 600, label: "Tomato paste reduction" },
    },
    {
      id: "step-2",
      order: 2,
      instruction:
        "Fold rinsed rice into seasoned base, cover tightly with foil and pot lid, and steam.",
      ingredientIds: ["line-rice", "line-salt"],
      heat: "low",
      timer: { durationSeconds: 1800, label: "Steam interval" },
    },
  ],
};

describe("Recipe Management Foundation", () => {
  describe("Role Authorization", () => {
    it("permits admins to perform all editorial actions", () => {
      expect(isAuthorized(adminContext, "create")).toBe(true);
      expect(isAuthorized(adminContext, "edit")).toBe(true);
      expect(isAuthorized(adminContext, "review")).toBe(true);
      expect(isAuthorized(adminContext, "record_test")).toBe(true);
      expect(isAuthorized(adminContext, "approve")).toBe(true);
      expect(isAuthorized(adminContext, "publish")).toBe(true);
    });

    it("permits editors to review and approve, but reserves publishing to admin", () => {
      expect(isAuthorized(editorContext, "create")).toBe(true);
      expect(isAuthorized(editorContext, "edit")).toBe(true);
      expect(isAuthorized(editorContext, "review")).toBe(true);
      expect(isAuthorized(editorContext, "approve")).toBe(true);
      expect(isAuthorized(editorContext, "publish")).toBe(false);
    });

    it("permits chef partners to author and test, but not review or approve", () => {
      expect(isAuthorized(chefContext, "create")).toBe(true);
      expect(isAuthorized(chefContext, "edit")).toBe(true);
      expect(isAuthorized(chefContext, "record_test")).toBe(true);
      expect(isAuthorized(chefContext, "review")).toBe(false);
      expect(isAuthorized(chefContext, "approve")).toBe(false);
      expect(isAuthorized(chefContext, "publish")).toBe(false);
    });

    it("rejects unauthorized actions with EditorialAuthorizationError", () => {
      expect(() => assertAuthorized(viewerContext, "create")).toThrow(EditorialAuthorizationError);
      expect(() => assertAuthorized(chefContext, "publish")).toThrow(EditorialAuthorizationError);
      expect(() => assertAuthorized(editorContext, "publish")).toThrow(EditorialAuthorizationError);
    });
  });

  describe("Draft Creation", () => {
    it("creates a well-formed draft recipe with initial status, version 1, and provenance", () => {
      const draft = createDraftRecipe(sampleDraftInput, chefContext);

      expect(draft.id).toBeDefined();
      expect(draft.slug).toBe("classic-jollof-rice");
      expect(draft.status).toBe("draft");
      expect(draft.contentVersion).toBe(1);
      expect(draft.createdAt).toBeDefined();
      expect(draft.updatedAt).toBeDefined();
      expect(draft.provenance?.author).toBe("Chef Tunde (Culinary Partner)");
      expect(draft.provenance?.statusHistory?.length).toBe(1);
      expect(draft.provenance?.statusHistory?.[0].toStatus).toBe("draft");
    });
  });

  describe("Recipe Updates", () => {
    it("updates recipe content, increments contentVersion, and updates timestamp", () => {
      const draft = createDraftRecipe(sampleDraftInput, chefContext);
      const updated = updateRecipeContent(
        draft,
        {
          title: "Smoky Party Jollof Rice",
          description: "Updated description emphasizing traditional firewood smoke technique.",
        },
        editorContext,
      );

      expect(updated.id).toBe(draft.id); // ID must never change
      expect(updated.title).toBe("Smoky Party Jollof Rice");
      expect(updated.contentVersion).toBe(2);
      expect(new Date(updated.updatedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(draft.createdAt!).getTime(),
      );
    });

    it("prevents direct in-place mutation of published recipes", () => {
      const publishedRecipe: Recipe = {
        ...seedRecipe,
        demo: false,
        status: "published",
        testedBy: "Chef Tester",
        createdAt: new Date().toISOString(),
      };

      expect(() =>
        updateRecipeContent(publishedRecipe, { title: "Illegal Edit" }, editorContext),
      ).toThrow("Published recipes cannot be edited directly in-place");
    });
  });

  describe("Lifecycle State Machine & Transitions", () => {
    it("progresses through the full validated lifecycle: draft -> in_review -> tested -> approved -> published", () => {
      // 1. Create draft
      const draft = createDraftRecipe(sampleDraftInput, chefContext);
      expect(draft.status).toBe("draft");

      // 2. Submit to in_review
      const inReview = transitionRecipeStatus(draft, "in_review", editorContext, {
        notes: "Submitted for initial schema and ingredient check.",
      });
      expect(inReview.status).toBe("in_review");

      // 3. Mark tested with kitchen tester attribution
      const tested = transitionRecipeStatus(inReview, "tested", chefContext, {
        testedBy: "Chef Tunde",
        notes: "Kitchen test completed. 45 min cook time verified on low burner.",
      });
      expect(tested.status).toBe("tested");
      expect(tested.testedBy).toBe("Chef Tunde");

      // 4. Approve by editor
      const approved = transitionRecipeStatus(tested, "approved", editorContext, {
        notes: "Approved for publishing schedule.",
      });
      expect(approved.status).toBe("approved");
      expect(approved.provenance?.reviewedBy).toBe("Emeka (Content Editor)");

      // 5. Publish by admin
      const published = transitionRecipeStatus(approved, "published", adminContext, {
        notes: "Published to production catalog.",
      });
      expect(published.status).toBe("published");
      expect(published.createdAt).toBeDefined();

      // Audit trail contains all 5 transitions
      expect(published.provenance?.statusHistory?.length).toBe(5);
    });

    it("rejects illegal transitions that skip lifecycle stages", () => {
      const draft = createDraftRecipe(sampleDraftInput, chefContext);

      // Cannot jump from draft to tested
      expect(() => transitionRecipeStatus(draft, "tested", chefContext)).toThrow(
        "Invalid recipe lifecycle transition from 'draft' to 'tested'",
      );

      // Cannot jump from draft to published
      expect(() => transitionRecipeStatus(draft, "published", adminContext)).toThrow(
        "Invalid recipe lifecycle transition from 'draft' to 'published'",
      );
    });

    it("prevents demo recipes from being marked as tested, approved, or published", () => {
      const demoDraft = createDraftRecipe({ ...sampleDraftInput, demo: true }, chefContext);
      const demoInReview = transitionRecipeStatus(demoDraft, "in_review", editorContext);

      expect(() =>
        transitionRecipeStatus(demoInReview, "tested", chefContext, { testedBy: "Chef Partner" }),
      ).toThrow("Demo content cannot be marked as tested");
    });
  });

  describe("Publication Readiness Validation", () => {
    it("passes publication check when all structural and kitchen criteria are fulfilled", () => {
      const draft = createDraftRecipe(sampleDraftInput, chefContext);
      const now = new Date().toISOString();
      const readyRecipe: Recipe = {
        ...draft,
        testedBy: "Chef Tunde",
        createdAt: draft.createdAt,
        updatedAt: now,
      };

      const result = validatePublicationReadiness(readyRecipe);
      expect(result.ready).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("fails publication check on missing description, missing kitchen tester, or demo flag", () => {
      const incompleteRecipe: Recipe = {
        ...seedRecipe,
        description: "", // missing description
        testedBy: undefined, // missing tester
        demo: true, // demo content
      };

      const result = validatePublicationReadiness(incompleteRecipe);
      expect(result.ready).toBe(false);
      expect(result.errors.some((e) => e.includes("Demo recipes cannot be published"))).toBe(true);
      expect(result.errors.some((e) => e.includes("testedBy"))).toBe(true);
    });

    it("fails publication check when step orders are non-contiguous", () => {
      const badStepsRecipe: Recipe = {
        ...seedRecipe,
        demo: false,
        testedBy: "Chef Tester",
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: "step-1",
            order: 1,
            instruction: "Fry paste.",
            ingredientIds: [],
          },
          {
            id: "step-3",
            order: 3, // gap! skipped 2
            instruction: "Steam rice.",
            ingredientIds: [],
          },
        ],
      };

      const result = validatePublicationReadiness(badStepsRecipe);
      expect(result.ready).toBe(false);
      expect(result.errors.some((e) => e.includes("contiguous"))).toBe(true);
    });
  });

  describe("Impact on Active Sessions and Saved Recipes", () => {
    it("reports version evolution while confirming active cooking sessions remain protected", () => {
      const draft = createDraftRecipe(sampleDraftInput, chefContext);
      const impact = checkRecipeEditImpact(draft, 42, 5);

      expect(impact.recipeId).toBe(draft.id);
      expect(impact.currentVersion).toBe(1);
      expect(impact.nextVersion).toBe(2);
      expect(impact.savedCooksAffected).toBe(42);
      expect(impact.activeSessionsProtected).toBe(5);
      expect(impact.policySummary).toContain("snapshot");
    });
  });
});
