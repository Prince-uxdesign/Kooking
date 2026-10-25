"use client";

import { Rocket } from "lucide-react";
import Link from "next/link";
import { useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/shared/ui/Modal";

/** Flip at launch: set NEXT_PUBLIC_APP_LAUNCHED=true in the build environment. */
export const APP_LAUNCHED = process.env.NEXT_PUBLIC_APP_LAUNCHED === "true";

const APP_PATH = /^\/(app|recipes|lists|saved|profile|cook)(\/|\?|#|$)/;

export function isAppHref(href: string) {
  return APP_PATH.test(href);
}

/**
 * Drop-in for next/link on the landing pages. Until launch, links into the
 * app open a "launching soon" note instead; everything else navigates.
 */
export function AppLink({ href, onClick, children, ...rest }: ComponentProps<typeof Link>) {
  const [open, setOpen] = useState(false);
  const path = typeof href === "string" ? href : (href.pathname ?? "");

  if (APP_LAUNCHED || !isAppHref(path)) {
    return (
      <Link href={href} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <a
        href={path}
        aria-haspopup="dialog"
        onClick={(e) => {
          onClick?.(e);
          e.preventDefault();
          setOpen(true);
        }}
        className={rest.className}
        aria-label={rest["aria-label"]}
      >
        {children}
      </a>
      {open && createPortal(<LaunchingSoon open onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function LaunchingSoon({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="We're launching soon" open={open} onClose={onClose}>
      <div className="flex flex-col gap-5 text-left">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700"
        >
          <Rocket size={22} strokeWidth={1.75} />
        </span>
        <p className="text-[1rem] leading-[1.6] text-ink-700">
          The Fork app isn&apos;t open yet. We&apos;re putting the finishing touches on it, and
          you&apos;ll be able to open the app, browse every recipe and start cooking as soon as we
          launch.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-ink-900 text-[0.9375rem] font-medium text-white transition-[background-color,scale] duration-150 ease-out hover:bg-ink-800 active:scale-[0.97]"
        >
          Got it
        </button>
      </div>
    </Modal>
  );
}
