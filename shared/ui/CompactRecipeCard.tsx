import { Bookmark, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { difficultyLabel, formatMinutes } from "@/shared/domain/discovery";
import type { RecipeDifficulty } from "@/shared/domain/recipe-schema";
import { Badge } from "./Badge";
import { RecipeImage } from "./RecipeImage";

export interface CompactRecipeCardProps {
  title: string;
  href?: string;
  image?: { src: string; alt: string };
  /** Total cooking or prep time in minutes. */
  minutes?: number;
  /** Content-assigned effort level. */
  difficulty?: RecipeDifficulty;
  /** Primary category or tag. */
  category?: string;
  /** Optional secondary text (e.g. session progress, view time, match reason). */
  meta?: string;
  /** Honest demo label. */
  demo?: boolean;
  /** Whether the recipe is saved/bookmarked. */
  saved?: boolean;
  /** Callback when save/bookmark button is toggled. */
  onSaveToggle?: () => void;
  /** Accessible label override for save button. */
  saveLabel?: string;
  /** Fallback icon for missing image. */
  FallbackIcon?: LucideIcon;
  /** Priority image loading. */
  priority?: boolean;
  className?: string;
}

/**
 * Compact Recipe Card (Clean Kitchen system):
 * - Horizontal layout for tight lists, mobile carousels, recently viewed, and drawers
 * - 64-80px rounded photo thumbnail with honest fallback
 * - Truncated title (15px font-medium text-ink-900)
 * - Quiet single-line metadata (time, difficulty, category)
 * - Optional isolated bookmark action (no unintended card navigation)
 */
export function CompactRecipeCard({
  title,
  href,
  image,
  minutes,
  difficulty,
  category,
  meta,
  demo = false,
  saved = false,
  onSaveToggle,
  saveLabel,
  FallbackIcon,
  priority = false,
  className = "",
}: CompactRecipeCardProps) {
  const timeLabel = formatMinutes(minutes);
  const diffText = difficultyLabel(difficulty);

  return (
    <article
      className={`group relative flex items-center gap-3.5 rounded-3xl bg-surface-100 p-2 pr-3.5 transition-colors hover:bg-surface-200/70 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-info-700 ${className}`}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] bg-surface-200 sm:h-20 sm:w-20">
        <RecipeImage
          image={image}
          compact
          priority={priority}
          FallbackIcon={FallbackIcon}
          className="h-full w-full rounded-[20px]"
        />
        {demo && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ink-700">
            Demo
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="line-clamp-1 text-[15px] font-medium leading-5 text-ink-900">
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

        {meta && <p className="line-clamp-1 text-[13px] text-ink-500">{meta}</p>}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[13px] text-ink-500">
          {timeLabel && (
            <span className="tnum inline-flex items-center gap-1">
              <Clock aria-hidden size={13} strokeWidth={1.75} />
              <span>{timeLabel}</span>
            </span>
          )}

          {diffText && (
            <span className="inline-flex items-center">
              {timeLabel && <span className="mr-2 text-ink-400">·</span>}
              <Badge tone="white">{diffText}</Badge>
            </span>
          )}

          {category && !diffText && !meta && (
            <span className="inline-flex items-center">
              {timeLabel && <span className="mr-2 text-ink-400">·</span>}
              <span className="text-ink-500">{category}</span>
            </span>
          )}
        </div>
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
          className={`relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white transition-colors hover:bg-surface-200 focus-visible:outline-3 focus-visible:outline-info-700 active:scale-95 ${
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
    </article>
  );
}
