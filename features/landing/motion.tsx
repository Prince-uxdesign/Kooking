"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";

/**
 * Landing motion primitives. Rules: docs/DESIGN_SYSTEM.md §12.
 * Everything here degrades to static content: no JS, or reduced motion,
 * means the final state renders immediately.
 */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** True once the element has entered the viewport (fires once by default). */
export function useInView<T extends Element>(
  options: { once?: boolean; rootMargin?: string; threshold?: number } = {},
) {
  const { once = true, rootMargin = "0px 0px -12% 0px", threshold = 0 } = options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);
  return { ref, inView };
}

/**
 * 0 → 1 as the element travels through the viewport.
 * `start`/`end` are viewport fractions for the element's top edge:
 * progress is 0 when the top sits at `start`, 1 when it reaches `end`.
 */
export function useScrollProgress<T extends HTMLElement>(start = 0.85, end = 0.25) {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const raw = (vh * start - top) / (vh * (start - end) || 1);
      const next = Math.min(1, Math.max(0, raw));
      // Two decimals is plenty and keeps React from re-rendering on every pixel.
      setProgress((prev) => (Math.abs(prev - next) < 0.01 ? prev : Math.round(next * 100) / 100));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [start, end]);
  return { ref, progress };
}

/** Fade + 16px rise when scrolled into view. `delay` staggers siblings. */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  style,
  children,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
} & Record<string, unknown>) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      data-in={inView}
      className={`reveal ${className}`}
      style={{ ...style, "--d": `${delay}ms` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Cycles 0..count-1 every `ms` while `active`. Holds still under reduced motion. */
export function useCycle(count: number, ms: number, active = true) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!active || reduced || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ms);
    return () => window.clearInterval(id);
  }, [count, ms, active, reduced]);
  return [index, setIndex] as const;
}
