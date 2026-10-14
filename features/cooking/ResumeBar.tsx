"use client";

import { Timer as TimerIcon, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cookHref } from "@/features/recipes/start-cooking";
import { useResumableSessions } from "./useResumableSessions";

const DISMISS_KEY = "kooking:resume-bar-dismissed";

/**
 * A slim "you're still cooking" bar on browsing pages. Never redirects
 * and never pops up over content; it can be dismissed for this visit.
 * Home has its own fuller card, so the bar isn't shown there.
 */
export function ResumeBar() {
  const pathname = usePathname();
  const { loaded, summaries } = useResumableSessions();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissed(null);
    }
  }, []);

  const first = summaries[0];
  if (!loaded || !first || pathname === "/" || dismissed === first.sessionId) return null;

  const timer = first.timers.find((t) => t.state === "done") ?? first.timers[0];
  const dismiss = () => {
    setDismissed(first.sessionId);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, first.sessionId);
    } catch {
      // Dismissal just won't outlast this page.
    }
  };

  return (
    <div
      role="region"
      aria-label="Unfinished cooking session"
      className="mb-4 flex items-center gap-2 rounded-full bg-ink-900 py-1.5 pl-4 pr-1.5 text-white"
    >
      <p className="tnum min-w-0 flex-1 truncate text-[14px]">
        <span className="font-medium">Still cooking {first.title}</span>
        {first.stepLabel && <span className="text-white/70"> · {first.stepLabel}</span>}
        {first.paused && <span className="text-white/70"> · Paused</span>}
        {timer && (
          <span className={timer.state === "done" ? "text-primary-400" : "text-white/70"}>
            {" "}
            · <TimerIcon aria-hidden size={13} className="inline -mt-0.5" /> {timer.label}{" "}
            {timer.text}
          </span>
        )}
      </p>
      <Link
        href={cookHref(first.sessionId)}
        className="inline-flex min-h-[40px] shrink-0 items-center rounded-full bg-primary-500 px-4 text-[14px] font-medium text-ink-900 hover:bg-primary-400"
      >
        Continue
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide for now"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
      >
        <X aria-hidden size={18} />
      </button>
    </div>
  );
}
