import type { ReactNode } from "react";
import type { RecipeSummary } from "@/shared/domain/discovery";
import { CollectionHeading } from "./CollectionHeading";
import { EmptyCollectionState } from "./EmptyCollectionState";
import { HorizontalRecipeList } from "./HorizontalRecipeList";
import { RecipeGrid } from "./RecipeGrid";

export interface RecipeCollectionSectionProps {
  /** Unique id for accessible labelling (`aria-labelledby`). */
  id: string;
  /** Section title. */
  title: string;
  /** Optional secondary subtitle or description. */
  description?: string;
  /** Optional count or metadata string. */
  meta?: string;
  /** Trailing action element (e.g. `SeeAllLink`). */
  action?: ReactNode;
  /** Recipes to display. */
  recipes: RecipeSummary[];
  /** Originating path for back-link preservation. */
  from?: string;
  /** Layout mode: "grid" (default) or "horizontal" (scrollable row). */
  layout?: "grid" | "horizontal";
  /** Optional search match reasons keyed by recipe id. */
  reasons?: Record<string, string | undefined>;
  /** Set of saved recipe ids. */
  savedIds?: string[];
  /** Callback when save is toggled. */
  onSaveToggle?: (recipeId: string) => void;
  /** Custom title when collection is empty. */
  emptyTitle?: string;
  /** Custom message when collection is empty. */
  emptyMessage?: string;
  /** Custom action when collection is empty. */
  emptyAction?: ReactNode;
  /** Heading semantic level (2 or 3). Defaults to 2. */
  headingLevel?: 2 | 3;
  className?: string;
}

/**
 * Recipe Collection Section (Clean Kitchen system):
 * - Composes `CollectionHeading`, `RecipeGrid` or `HorizontalRecipeList`, and `EmptyCollectionState`
 * - Consistent 16px gap between title and items
 * - Accessible heading relationship via `aria-labelledby`
 * - Handles empty collection gracefully without layout breaks
 */
export function RecipeCollectionSection({
  id,
  title,
  description,
  meta,
  action,
  recipes,
  from,
  layout = "grid",
  reasons,
  savedIds,
  onSaveToggle,
  emptyTitle,
  emptyMessage,
  emptyAction,
  headingLevel = 2,
  className = "",
}: RecipeCollectionSectionProps) {
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-4 ${className}`}>
      <CollectionHeading
        id={id}
        title={title}
        description={description}
        meta={meta}
        action={action}
        level={headingLevel}
      />

      {recipes.length === 0 ? (
        <EmptyCollectionState title={emptyTitle} message={emptyMessage} action={emptyAction} />
      ) : layout === "horizontal" ? (
        <HorizontalRecipeList
          recipes={recipes}
          from={from}
          savedIds={savedIds}
          onSaveToggle={onSaveToggle}
          label={title}
        />
      ) : (
        <RecipeGrid
          recipes={recipes}
          from={from}
          reasons={reasons}
          savedIds={savedIds}
          onSaveToggle={onSaveToggle}
        />
      )}
    </section>
  );
}
