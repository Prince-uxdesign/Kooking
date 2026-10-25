import { Bookmark, Clock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { difficultyLabel, formatMinutes } from "@/shared/domain/discovery";
import type { RecipeDifficulty } from "@/shared/domain/recipe-schema";
import { buttonClasses } from "./Button";
import { RecipeImage } from "./RecipeImage";
import { SaveButton } from "@/features/saved/SaveButton";

export interface FeaturedRecipeCardProps {
  title: string;
  href: string;
  image?: { src: string; alt: string };
  /** Total cooking or prep time in minutes. */
  minutes?: number;
  /** Number of base servings. */
  servings?: number;
  /** Content-assigned effort level. */
  difficulty?: RecipeDifficulty;
  /** Categories associated with the recipe. */
  categories?: string[];
  /** Honest demo label. Never presented as chef-tested or approved. */
  demo?: boolean;
  /** Optional summary or description. */
  description?: string;
  /** Eyebrow badge text (defaults to "Featured recipe"). */
  eyebrow?: string;
  /** CTA button text (defaults to "View recipe"). */
  ctaLabel?: string;
  /** Whether the recipe is saved/bookmarked. */
  saved?: boolean;
  /** Callback when save button is clicked. */
  onSaveToggle?: () => void;
  /** Stable recipe id: shows a save button wired to the shared saved store. */
  recipeId?: string;
  /** Accessible label override for save button. */
  saveLabel?: string;
  /** Fallback icon for missing image. */
  FallbackIcon?: LucideIcon;
  /** Priority image loading. */
  priority?: boolean;
  className?: string;
}

/**
 * Featured Recipe Presentation (Clean Kitchen system):
 * - White anchor card with a hairline edge; photo leads
 * - Clean two-column responsive split on tablets/desktops (stacked on phones)
 * - Soft pepper eyebrow chip
 * - Facts only: real cooking time, base servings, and difficulty from data
 * - Honest demo badge and disclaimer when demo=true
 * - Accessible link & button hierarchy with visible focus states
 */
export function FeaturedRecipeCard({
  title,
  href,
  image,
  minutes,
  servings,
  difficulty,
  demo = false,
  description,
  eyebrow = "Featured recipe",
  ctaLabel = "View recipe",
  saved = false,
  onSaveToggle,
  recipeId,
  saveLabel,
  FallbackIcon,
  priority = true,
  className = "",
}: FeaturedRecipeCardProps) {
  const time = formatMinutes(minutes);
  const diffText = difficultyLabel(difficulty);

  return (
    <article
      className={`card-edge group relative overflow-hidden rounded-[32px] bg-white p-1.5 text-ink-900 sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${className}`}
    >
      <Link href={href} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-[27px]">
        <RecipeImage
          image={image}
          priority={priority}
          FallbackIcon={FallbackIcon}
          className="aspect-[4/3] w-full rounded-[27px] transition-[scale] duration-700 ease-out group-hover:scale-[1.02] sm:aspect-auto sm:h-full sm:min-h-[320px]"
        />
      </Link>

      <div className="flex flex-col gap-3 px-4 pb-4 pt-5 sm:justify-center sm:gap-4 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-50 px-3 py-1 text-[0.8125rem] font-medium text-primary-700">
              {eyebrow}
            </span>
            {demo && (
              <span className="rounded-full bg-surface-100 px-3 py-1 text-[0.8125rem] font-medium text-ink-700">
                Demo
              </span>
            )}
          </div>

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
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-3 focus-visible:outline-info-700 active:scale-95 ${
                saved
                  ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                  : "bg-surface-100 text-ink-900 hover:bg-surface-200"
              }`}
            >
              <Bookmark
                aria-hidden
                size={18}
                strokeWidth={1.75}
                fill={saved ? "currentColor" : "none"}
              />
            </button>
          )}
          {!onSaveToggle && recipeId && (
            <SaveButton recipeId={recipeId} title={title} variant="featured" />
          )}
        </div>

        <h3 className="line-clamp-3 font-headline text-[1.75rem] font-medium leading-[1.05] tracking-[-0.025em] sm:text-[2.25rem]">
          <Link href={href} className="text-ink-900 hover:underline focus-visible:outline-none">
            {title}
          </Link>
        </h3>

        {description && (
          <p className="line-clamp-2 text-[0.9375rem] leading-6 text-ink-500">{description}</p>
        )}

        <ul className="flex flex-wrap gap-2 text-[0.875rem] text-ink-700">
          {time && (
            <li className="tnum inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface-100 px-3">
              <Clock aria-hidden size={16} strokeWidth={1.75} />
              <span>
                <span className="sr-only">Total time: </span>
                {time}
              </span>
            </li>
          )}

          {typeof servings === "number" && servings > 0 && (
            <li className="tnum inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface-100 px-3">
              <Users aria-hidden size={16} strokeWidth={1.75} />
              <span>Serves {servings}</span>
            </li>
          )}

          {diffText && (
            <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-surface-100 px-3">
              <span>{diffText}</span>
            </li>
          )}
        </ul>

        {demo && (
          <p className="text-[0.8125rem] leading-5 text-ink-500">
            Sample recipe for development. Not chef-tested.
          </p>
        )}

        <Link
          href={href}
          className={buttonClasses({
            variant: "primary",
            className: "mt-2 w-full sm:w-auto sm:self-start",
          })}
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
