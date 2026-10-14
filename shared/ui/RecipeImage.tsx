import { CookingPot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PhotoWithFallback } from "./PhotoWithFallback";

interface RecipeImageProps {
  image?: { src: string; alt: string };
  /** Sizing/aspect classes from the caller, e.g. "aspect-[4/3]". */
  className?: string;
  /** Above-the-fold images load eagerly. */
  priority?: boolean;
  /** Small thumbnails show the icon only. */
  compact?: boolean;
  FallbackIcon?: LucideIcon;
}

/**
 * Food photo with an honest fallback. Missing or broken images render
 * a flat neutral tile in the same box, so layout never shifts or breaks.
 * Server-safe: the icon renders here; only load-error handling is
 * client-side.
 */
export function RecipeImage({
  image,
  className = "",
  priority = false,
  compact = false,
  FallbackIcon = CookingPot,
}: RecipeImageProps) {
  const fallback = (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-500"
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-white text-ink-700 ${
          compact ? "h-9 w-9" : "h-10 w-10 @[200px]:h-14 @[200px]:w-14"
        }`}
      >
        <FallbackIcon size={compact ? 18 : 22} strokeWidth={1.75} />
      </span>
      {/* Caption only where it fits — narrow 2-up cards show the icon alone. */}
      {!compact && <span className="hidden text-[13px] @[200px]:inline">Photo coming soon</span>}
    </div>
  );

  return (
    <div className={`@container relative overflow-hidden bg-surface-200 ${className}`}>
      {image ? (
        <PhotoWithFallback
          src={image.src}
          alt={image.alt}
          priority={priority}
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
