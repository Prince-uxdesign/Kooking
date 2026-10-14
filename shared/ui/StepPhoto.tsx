"use client";

import { useState } from "react";

/**
 * Photo of one recipe step. Unlike RecipeImage there is no fallback
 * tile: a step without a working photo simply shows no photo.
 */
export function StepPhoto({
  image,
  className = "",
}: {
  image: { src: string; alt: string };
  /** Sizing/aspect/surface classes from the caller. */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
