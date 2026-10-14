import { Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatMinutes } from "@/shared/domain/discovery";
import { Badge } from "./Badge";
import { buttonClasses } from "./Button";
import { RecipeImage } from "./RecipeImage";

interface RecipeCardProps {
  title: string;
  meta?: string;
  minutes?: number;
  tags?: string[];
  image?: { src: string; alt: string };
  /** Labels sample content honestly. */
  demo?: boolean;
  /** Whole card becomes one link target. */
  href?: string;
  onOpen?: () => void;
  FallbackIcon?: LucideIcon;
}

/**
 * Recipe card: soft-gray card, photo inset with its own rounded corners,
 * title and quiet meta underneath. Flat — no border, no shadow.
 * No ratings, popularity, or endorsements.
 */
export function RecipeCard({
  title,
  meta,
  minutes,
  tags = [],
  image,
  demo = false,
  href,
  onOpen,
  FallbackIcon,
}: RecipeCardProps) {
  const timeLabel = formatMinutes(minutes);

  return (
    <div className="relative flex h-full flex-col rounded-3xl bg-surface-100 p-1.5 transition-colors hover:bg-surface-200/70 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-info-700">
      <div className="relative">
        <RecipeImage
          image={image}
          className="aspect-[4/3] w-full rounded-[22px]"
          FallbackIcon={FallbackIcon}
        />
        {demo && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-700">
            Demo
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-3">
        <h3 className="line-clamp-2 text-[15px] font-medium leading-5 text-ink-900">
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
        {meta && <p className="text-[13px] leading-5 text-ink-500">{meta}</p>}
        {(timeLabel || tags.length > 0) && (
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
            {timeLabel && (
              <span className="tnum inline-flex items-center gap-1 text-[13px] text-ink-500">
                <Clock aria-hidden size={14} />
                {timeLabel}
              </span>
            )}
            {tags.slice(0, 3).map((t) => (
              <Badge key={t} tone="white">
                {t}
              </Badge>
            ))}
          </div>
        )}
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open recipe: ${title}`}
            className={buttonClasses({ variant: "dark", className: "mt-3 w-full" })}
          >
            View recipe
          </button>
        )}
      </div>
    </div>
  );
}
