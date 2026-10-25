"use client";

import { PHOTOS, type PhotoKey } from "./content";

/** Unsplash photos for the landing page (Unsplash licence: no attribution required). */

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
