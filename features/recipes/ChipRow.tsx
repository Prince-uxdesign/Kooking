"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * One swipeable chip row on phones (bleeds to the screen edge),
 * wrapping from 640px. Scrolls the selected chip into view so the
 * current category is never hidden off-screen.
 */
export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const row = ref.current;
    const selected = row?.querySelector<HTMLElement>("[aria-current]");
    if (!row || !selected || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = selected.offsetLeft - (row.clientWidth - selected.offsetWidth) / 2;
  }, []);

  return (
    <ul
      ref={ref}
      aria-label={label}
      className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      {children}
    </ul>
  );
}
