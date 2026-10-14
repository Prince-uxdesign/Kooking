import { LocalKitchenChecks, LocalSessions } from "@/shared/data/local";
import { createCookingSession, reconcileExisting } from "@/shared/domain/cooking-session";
import { kitchenCheckKey, type CookingReadiness } from "@/shared/domain/kitchen-check";
import type { Recipe } from "@/shared/domain/recipe-schema";
import { resumeSummary, type ResumeSummary } from "@/shared/domain/recovery";

const localSessions = new LocalSessions();
const localChecks = new LocalKitchenChecks();

export type GuardedStart =
  | { ok: true; href: string; resumed: boolean }
  | {
      ok: false;
      reason: "not-ready" | "invalid-servings" | "invalid-recipe" | "storage";
      message: string;
      readiness?: CookingReadiness;
    }
  | {
      ok: false;
      reason: "conflict";
      message: string;
      /** The unfinished session for this recipe that would be ended. */
      existing: ResumeSummary;
    };

function newSessionId(slug: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `cook_${slug}_${Date.now()}_${rand}`.slice(0, 100);
}

/**
 * The only way into Cooking Mode from the UI.
 *
 * 1. Reads the stored Kitchen Check (component state is never trusted).
 * 2. Creates the session through `createCookingSession`, which
 *    re-evaluates readiness and validates servings.
 * 3. Resumes an open session for the same recipe version + servings
 *    instead of starting a duplicate. A mismatched open session (other
 *    servings or an older recipe version) is never ended silently: the
 *    caller gets a "conflict" and must pass `replaceExisting: true`
 *    after the cook chooses to end it.
 * 4. Persists before navigating, so a refresh lands on the session.
 */
export async function startCookingIfReady(args: {
  recipe: Recipe;
  servings: number;
  ingredientNames: Record<string, string>;
  replaceExisting?: boolean;
}): Promise<GuardedStart> {
  const { recipe, servings } = args;
  const now = Date.now();

  let record = null;
  try {
    record = await localChecks.load(kitchenCheckKey(recipe, servings));
  } catch {
    record = null;
  }

  const created = createCookingSession({
    id: newSessionId(recipe.slug),
    recipe,
    servings,
    record,
    ingredientNames: args.ingredientNames,
    now,
  });
  if (!created.ok) return created;

  try {
    const existing = await localSessions.latestForRecipe(recipe.id);
    const { resume, abandon } = reconcileExisting(existing, recipe, servings, now);
    if (resume) return { ok: true, href: cookHref(resume.id), resumed: true };
    if (abandon && existing && !args.replaceExisting) {
      return {
        ok: false,
        reason: "conflict",
        message: `You have an unfinished session for this recipe at ${existing.servings} servings.`,
        existing: resumeSummary(existing, now),
      };
    }
    if (abandon) await localSessions.store(abandon);
    await localSessions.store(created.session);
    return { ok: true, href: cookHref(created.session.id), resumed: false };
  } catch {
    return {
      ok: false,
      reason: "storage",
      message: "Couldn't save your cooking session on this device. Check storage and try again.",
    };
  }
}

export function cookHref(sessionId: string): string {
  return `/cook/${encodeURIComponent(sessionId)}`;
}
