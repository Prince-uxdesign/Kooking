"use client";

import { Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LocalSessions } from "@/shared/data/local";
import type { RecipeSummary } from "@/shared/domain/discovery";
import { resumeProgressLabel, type CookingSession } from "@/shared/domain/session";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { iconForRecipe } from "@/features/recipes/category-icons";

const sessions = new LocalSessions();

/**
 * Resume card — shown only when an active or paused session exists on
 * this device. Renders nothing while loading or when there's nothing
 * to resume, so it never implies progress that isn't there.
 */
export function ContinueCooking({ catalog }: { catalog: RecipeSummary[] }) {
  const [session, setSession] = useState<CookingSession | null>(null);

  useEffect(() => {
    let live = true;
    sessions
      .latestResumable()
      .then((s) => live && setSession(s))
      .catch(() => live && setSession(null));
    return () => {
      live = false;
    };
  }, []);

  if (!session) return null;

  const recipe = catalog.find((r) => r.id === session.recipeId) ?? null;
  const progress = resumeProgressLabel(session, recipe?.stepCount ?? null);
  const state = session.status === "paused" ? "Paused" : "In progress";
  const href = `/cook/${encodeURIComponent(session.id)}`;

  return (
    <section
      aria-labelledby="continue-heading"
      className="flex items-center gap-3.5 rounded-3xl bg-surface-100 p-2 pr-3"
    >
      <RecipeImage
        image={recipe?.image}
        compact
        FallbackIcon={iconForRecipe(recipe?.categories ?? [])}
        className="h-16 w-16 shrink-0 rounded-[18px]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2
          id="continue-heading"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-500"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent-500" />
          Continue cooking
        </h2>
        <p className="line-clamp-1 text-[16px] font-medium leading-6 text-ink-900">
          {recipe?.title ?? "Your cooking session"}
        </p>
        <p className="tnum text-[13px] text-ink-500">
          {[progress, state].filter(Boolean).join(" · ")}
        </p>
      </div>
      <Link
        href={href}
        aria-label={`Resume cooking${recipe ? `: ${recipe.title}` : ""}`}
        title="Resume"
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-500 text-ink-900 hover:bg-primary-600"
      >
        <Play aria-hidden size={18} fill="currentColor" />
      </Link>
    </section>
  );
}
