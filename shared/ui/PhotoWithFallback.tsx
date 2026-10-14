"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Client half of RecipeImage: swaps to the server-rendered fallback if
 * the photo fails to load. Plain <img>: sources may be local or
 * CMS-hosted later; no remote image allowlist is configured yet.
 */
export function PhotoWithFallback({
  src,
  alt,
  priority,
  fallback,
}: {
  src: string;
  alt: string;
  priority: boolean;
  fallback: ReactNode;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // A server-rendered <img> can fail before hydration attaches onError —
  // catch that case on mount (finished loading, but no pixels).
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return fallback;

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
