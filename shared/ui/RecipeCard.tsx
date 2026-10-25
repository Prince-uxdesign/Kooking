import { Bookmark, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { difficultyLabel, formatMinutes } from "@/shared/domain/discovery";
import type { RecipeDifficulty } from "@/shared/domain/recipe-schema";
import { buttonClasses } from "./Button";
import { RecipeImage } from "./RecipeImage";
import { SaveButton } from "@/features/saved/SaveButton";

export interface RecipeCardProps {
  title: string;
  href?: string;
  image?: { src: string; alt: string };
  /** Total cooking/preparation time in minutes. */
  minutes?: number;
  /** Content-assigned effort level. Shown only when defined in data. */
  difficulty?: RecipeDifficulty;
  /** Associated categories. */
  categories?: string[];
  /** Associated tags. */
  tags?: string[];
  /** Optional secondary line (e.g. search matching reason or subtitle). */
  meta?: string;
  /** Honest demo label. Never presented as chef-tested. */
  demo?: boolean;
  /** Whether the recipe is saved/bookmarked. */
  saved?: boolean;
  /** Callback when save/bookmark button is toggled. */
  onSaveToggle?: () => void;
  /**
   * Stable recipe id. When given (and no `onSaveToggle`), the card shows a
   * save button wired to the shared saved-recipes store.
   */
  recipeId?: string;
  /** Accessible label override for save button. */
  saveLabel?: string;
  /** Optional manual open action button. */
  onOpen?: () => void;
  /** Fallback icon for missing images. */
  FallbackIcon?: LucideIcon;
  /** Priority image loading for above-the-fold cards. */
  priority?: boolean;
  className?: string;
}

/**
 * Standard Recipe Card (Clean Kitchen system):
 * - Soft-gray card (`bg-surface-100 p-1.5`)
 * - Photo inset with rounded corners (`aspect-[4/3] rounded-[22px]`)
 * - Semibold title (15px font-medium leading-5 text-ink-900)
 * - Quiet metadata underneath (time, difficulty, tags)
 * - Optional save action with isolated tap target (no unintended card navigation)
 * - Entire card surface is clickable when `href` is provided
 * - Flat — no shadows, gradients, or fabricated badges
 */
export function RecipeCard({
  title,
  href,
  image,
  minutes,
  difficulty,
  meta,
  demo = false,
  saved = false,
  onSaveToggle,
  recipeId,
  saveLabel,
  onOpen,
  FallbackIcon,
  priority = false,
  className = "",
}: RecipeCardProps) {
  const timeLabel = formatMinutes(minutes);
  const diffText = difficultyLabel(difficulty);

  return (
    <article
      className={`card-edge group relative flex h-full flex-col rounded-3xl bg-white p-1.5 transition-[box-shadow,translate] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_var(--color-line-strong),0_18px_36px_-18px_rgb(21_18_15/0.25)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-info-700 ${className}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] bg-surface-100">
        <RecipeImage
          image={image}
          priority={priority}
          FallbackIcon={FallbackIcon}
          className="h-full w-full rounded-[20px] transition-[scale] duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Honest demo indicator */}
        {demo && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-medium text-ink-700 backdrop-blur">
            Demo
          </span>
        )}

        {/* Save/bookmark toggle — positioned with isolated z-10 to prevent link navigation */}
        {onSaveToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSaveToggle();
            }}
            aria-label={
              saveLabel ?? (saved ? `Remove ${title} from saved` : `Save ${title} for later`)
            }
            aria-pressed={saved}
            className={`absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white transition-colors hover:bg-surface-200 focus-visible:outline-3 focus-visible:outline-info-700 active:scale-95 ${
              saved ? "text-primary-700" : "text-ink-700"
            }`}
          >
            <Bookmark
              aria-hidden
              size={16}
              strokeWidth={1.75}
              fill={saved ? "currentColor" : "none"}
            />
          </button>
        )}
        {!onSaveToggle && recipeId && (
          <SaveButton
            recipeId={recipeId}
            title={title}
            variant="card"
            className="absolute right-2 top-2 z-10"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <h3 className="line-clamp-2 text-[1rem] font-semibold leading-5 tracking-[-0.01em] text-ink-900">
          {href ? (
            <Link
              href={href}
              className="after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>

        {meta && <p className="text-[0.8125rem] leading-5 text-ink-500">{meta}</p>}

        {/* Quiet metadata: only show real fields present in data */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-1.5">
          {timeLabel && (
            <span className="tnum inline-flex items-center gap-1 text-[0.8125rem] text-ink-500">
              <Clock aria-hidden size={14} strokeWidth={1.75} />
              <span>{timeLabel}</span>
            </span>
          )}

          {diffText && (
            <span className="inline-flex items-center gap-2.5 whitespace-nowrap text-[0.8125rem] text-ink-500">
              {timeLabel && <span aria-hidden className="h-1 w-1 rounded-full bg-ink-300" />}
              {diffText}
            </span>
          )}
        </div>

        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open recipe: ${title}`}
            className={buttonClasses({ variant: "dark", className: "relative z-10 mt-3 w-full" })}
          >
            View recipe
          </button>
        )}
      </div>
    </article>
  );
}
