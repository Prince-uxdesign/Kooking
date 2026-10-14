"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * Bottom sheet for mobile-first actions (servings, filters).
 * Round dark close button + centered title on top, content below.
 * Desktop renders centered; no separate component tree.
 */
export function BottomSheet({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-t-[32px] bg-white px-5 pb-8 pt-5 sm:rounded-[32px] sm:p-6"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-white hover:bg-ink-800"
          >
            <X aria-hidden size={20} />
          </button>
          <h2 className="text-[17px] font-medium text-ink-900">{title}</h2>
        </div>
        {children}
      </section>
    </div>
  );
}
