"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import { useDialogFocus } from "./useDialogFocus";

/** Accessible dialog: labelled, focus moves in and is kept inside, Esc closes, focus returns. */
export function Modal({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ open, panelRef, initialFocusRef: closeRef, onClose });

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/30 p-4 backdrop-blur-[2px] sm:items-center"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[32px] bg-white p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-headline text-[1.375rem] font-medium tracking-[-0.02em] text-ink-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[0.9375rem] leading-6 text-ink-500">{description}</p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-100 text-ink-900 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-200 active:scale-95"
          >
            <X aria-hidden size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
