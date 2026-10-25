import { useId } from "react";

/** Pin outline and the fork cut out of it, on a 64-unit grid. Keep in sync with scripts/generate-icons.mjs. */
export const PIN_PATH =
  "M32 3C18.2 3 8 13.6 8 27c0 15.5 16.5 28.6 22.2 33.1a2.9 2.9 0 0 0 3.6 0C39.5 55.6 56 42.5 56 27 56 13.6 45.8 3 32 3z";

export const FORK_CUT = [
  '<rect x="29.7" y="-2" width="4.6" height="19" rx="2.3"/>',
  '<path d="M29.7 15H34.3C34.3 20 40.5 21.2 40.5 27.5V33H23.5V27.5C23.5 21.2 29.7 20 29.7 15Z"/>',
  '<rect x="23.5" y="27" width="3" height="19.5" rx="1.5"/>',
  '<rect x="28.17" y="27" width="3" height="19.5" rx="1.5"/>',
  '<rect x="32.83" y="27" width="3" height="19.5" rx="1.5"/>',
  '<rect x="37.5" y="27" width="3" height="19.5" rx="1.5"/>',
].join("");

const TONES = {
  brand: ["#F0571A", "#FF7A3D"],
  white: ["#FFFFFF", "#FFE7D8"],
  ink: ["#15120F", "#3A352F"],
} as const;

/**
 * The Fork mark: a map pin with a fork cut through it. The handle breaks
 * the top edge; the right half is a lighter fold.
 */
export function ForkMark({
  size = 28,
  tone = "brand",
  className = "",
}: {
  size?: number;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [left, right] = TONES[tone];
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
          <rect width="64" height="64" fill="#fff" />
          <g fill="#000" dangerouslySetInnerHTML={{ __html: FORK_CUT }} />
        </mask>
        <clipPath id={`r${id}`}>
          <rect x="32" y="0" width="32" height="64" />
        </clipPath>
      </defs>
      <g mask={`url(#m${id})`}>
        <path d={PIN_PATH} fill={left} />
        <path d={PIN_PATH} fill={right} clipPath={`url(#r${id})`} />
      </g>
    </svg>
  );
}

/** Mark + lowercase serif wordmark. */
export function ForkLogo({
  size = 30,
  tone = "brand",
  wordClassName = "text-ink-900",
}: {
  size?: number;
  tone?: keyof typeof TONES;
  wordClassName?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ForkMark size={size} tone={tone} />
      <span
        className={`font-display leading-none tracking-[-0.02em] ${wordClassName}`}
        style={{ fontSize: Math.round(size * 0.95) }}
      >
        fork
      </span>
    </span>
  );
}
