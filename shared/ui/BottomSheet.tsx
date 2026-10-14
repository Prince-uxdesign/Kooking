"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { useDialogFocus } from "./useDialogFocus";

/**
 * Bottom sheet for mobile-first actions (servings, filters).
 * Round dark close button + centered title on top, content below,
 * optional sticky footer. Desktop renders centered; no separate tree.
 * Dialog behaviour: focus moves in on open, Tab stays inside, Esc
 * closes, focus returns to the trigger, and the page behind can't scroll.
 */
export function BottomSheet({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocus({ open, panelRef, initialFocusRef: closeRef, onClose });

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-4"
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[32px] bg-white sm:max-h-[85vh] sm:rounded-[32px]"
      >
        <div className="flex flex-col items-center gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-white hover:bg-ink-800"
          >
            <X aria-hidden size={20} />
          </button>
          <h2 className="text-[1.0625rem] font-medium text-ink-900">{title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
          {children}
        </div>
        {footer && <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6">{footer}</div>}
      </section>
    </div>
  );
}
