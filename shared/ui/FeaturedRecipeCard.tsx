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
 * - Dark anchor card (`rounded-[32px] bg-ink-900 p-1.5 text-white`)
 * - Clean two-column responsive split on tablets/desktops (stacked on phones)
 * - Fresh green eyebrow chip (`bg-primary-500 text-ink-900`)
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
      className={`group relative overflow-hidden rounded-[32px] bg-ink-900 p-1.5 text-white sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${className}`}
    >
      <Link href={href} tabIndex={-1} aria-hidden className="block">
        <RecipeImage
          image={image}
          priority={priority}
          FallbackIcon={FallbackIcon}
          className="aspect-[4/3] w-full rounded-[27px] sm:aspect-auto sm:h-full sm:min-h-[300px]"
        />
      </Link>

      <div className="flex flex-col gap-3 px-4 pb-4 pt-5 sm:justify-center sm:gap-4 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-500 px-3 py-1 text-[0.8125rem] font-medium text-ink-900">
              {eyebrow}
            </span>
            {demo && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[0.8125rem] font-medium text-white/80">
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
                  ? "bg-primary-500 text-ink-900 hover:bg-primary-600"
                  : "bg-white/10 text-white hover:bg-white/20"
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

        <h3 className="line-clamp-3 text-[1.5rem] font-semibold leading-8 sm:text-[1.75rem] sm:leading-9">
          <Link href={href} className="text-white hover:underline focus-visible:outline-none">
            {title}
          </Link>
        </h3>

        {description && (
          <p className="line-clamp-2 text-[0.875rem] leading-6 text-white/70">{description}</p>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.875rem] text-white/70">
          {time && (
            <li className="tnum inline-flex items-center gap-1.5">
              <Clock aria-hidden size={16} strokeWidth={1.75} />
              <span>
                <span className="sr-only">Total time: </span>
                {time}
              </span>
            </li>
          )}

          {typeof servings === "number" && servings > 0 && (
            <li className="tnum inline-flex items-center gap-1.5">
              <Users aria-hidden size={16} strokeWidth={1.75} />
              <span>Serves {servings}</span>
            </li>
          )}

          {diffText && (
            <li className="inline-flex items-center gap-1.5">
              <span>{diffText}</span>
            </li>
          )}
        </ul>

        {demo && (
          <p className="text-[0.8125rem] leading-5 text-white/55">
            Sample recipe for development. Not chef-tested.
          </p>
        )}

        <Link
          href={href}
          className={buttonClasses({
            variant: "light",
            className: "mt-2 w-full sm:w-auto sm:self-start",
          })}
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
