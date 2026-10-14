"use client";

import { useId } from "react";
import { PHOTOS, type PhotoKey } from "./content";
import { useInView } from "./motion";

/**
 * Hand-made textures for the landing page: a watercolour wash with torn
 * paper edges, a highlighter stroke, and Unsplash photos. All decorative.
 */

const WASH = {
  green: { base: "#E3F8E8", mottle: "#C9F0D4" },
  cream: { base: "#F7F1E6", mottle: "#EEE3CF" },
} as const;

/** Absolutely positioned wash. Put it first inside a `relative` section. */
export function Wash({
  tone = "green",
  className = "",
}: {
  tone?: keyof typeof WASH;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const c = WASH[tone];
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full ${className}`}
      viewBox="0 0 1200 900"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Torn edges: displace the shape with low-frequency noise. */}
        <filter id={`torn-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.045" numOctaves="4" seed="7" />
          <feDisplacementMap
            in="SourceGraphic"
            scale="34"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        {/* Watercolour mottling: a darker layer kept only where noise is high. */}
        <filter id={`mottle-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="4" seed="3" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.55" />
          <feComposite in="SourceGraphic" operator="in" />
        </filter>
        {/* Paper grain */}
        <filter id={`grain-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" />
          <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0.07 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#torn-${id})`}>
        <rect x="0" y="28" width="1200" height="844" fill={c.base} />
        <rect
          x="0"
          y="28"
          width="1200"
          height="844"
          fill={c.mottle}
          filter={`url(#mottle-${id})`}
        />
        <rect x="0" y="28" width="1200" height="844" fill={c.base} filter={`url(#grain-${id})`} />
      </g>
    </svg>
  );
}

/**
 * Words with a green marker stroke behind them. The stroke draws itself
 * in when scrolled into view.
 */
export function Highlight({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: "green" | "cream";
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ rootMargin: "0px 0px -15% 0px" });
  return (
    <span
      ref={ref}
      data-in={inView}
      className="highlight relative isolate inline-block whitespace-nowrap"
    >
      <svg
        aria-hidden
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
        className="absolute -left-[3%] bottom-[0.02em] -z-10 h-[0.42em] w-[106%]"
      >
        <path
          d="M3 12 C 38 6, 82 15, 118 9 S 176 6, 197 11"
          pathLength={1}
          fill="none"
          stroke={tone === "green" ? "#7FE99F" : "#F2C98B"}
          strokeOpacity="0.75"
          strokeWidth="13"
          strokeLinecap="round"
        />
      </svg>
      {children}
    </span>
  );
}

/** Unsplash CDN URL at a given width (served as AVIF/WebP where supported). */
export function photoUrl(key: PhotoKey, w: number) {
  return `https://images.unsplash.com/${PHOTOS[key].id}?auto=format&fit=crop&w=${w}&q=72`;
}

/** Rounded photo. Sizes are hints for srcset; the frame sets the shape. */
export function Photo({
  name,
  className = "",
  sizes = "(min-width: 1024px) 40vw, 90vw",
  priority = false,
}: {
  name: PhotoKey;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const p = PHOTOS[name];
  return (
    // Plain <img>: Unsplash's CDN resizes and picks formats itself, and the
    // landing page doesn't need next/image's remote allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(name, 900)}
      srcSet={[480, 900, 1400].map((w) => `${photoUrl(name, w)} ${w}w`).join(", ")}
      sizes={sizes}
      alt={p.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`block h-full w-full bg-surface-200 object-cover ${className}`}
      style={{ objectPosition: "focus" in p ? p.focus : "center" }}
    />
  );
}

/** Photo credit, as Unsplash asks. */
export function Credit({ name, className = "" }: { name: PhotoKey; className?: string }) {
  const p = PHOTOS[name];
  return (
    <a
      href={`https://unsplash.com/${p.by}?utm_source=kooking&utm_medium=referral`}
      target="_blank"
      rel="noreferrer"
      className={`text-[0.75rem] text-ink-500 underline-offset-2 hover:text-ink-900 hover:underline ${className}`}
    >
      Photo: {p.name} / Unsplash
    </a>
  );
}
