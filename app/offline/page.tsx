"use client";

import {
  AlertCircle,
  ArrowRight,
  CookingPot,
  RefreshCw,
  ShoppingBasket,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LocalSessions, LocalShopping } from "@/shared/data/local";
import { type CookingSession } from "@/shared/domain/session";
import { type ShoppingList } from "@/shared/domain/shopping";
import { GUEST_OWNER } from "@/shared/domain/user";
import { buttonClasses } from "@/shared/ui/Button";

const sessions = new LocalSessions();
const shopping = new LocalShopping();

export default function OfflinePage() {
  const [activeSession, setActiveSession] = useState<CookingSession | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [checking, setChecking] = useState(false);
  const [reconnectFailed, setReconnectFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadLocalData() {
      try {
        const session = await sessions.latestResumable();
        const list = await shopping.load(GUEST_OWNER);
        if (!mounted) return;
        setActiveSession(session);
        setShoppingList(list);
      } catch {
        // Local storage unavailable or empty
      }
    }
    void loadLocalData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRetry = async () => {
    setChecking(true);
    setReconnectFailed(false);
    try {
      const res = await fetch("/api/ping", { method: "HEAD", cache: "no-store" });
      if (res.ok) {
        window.location.reload();
        return;
      }
    } catch {
      // Still offline
    }
    setChecking(false);
    setReconnectFailed(true);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <WifiOff size={32} strokeWidth={2.2} />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
        You&apos;re Offline
      </h1>
      <p className="mt-3 max-w-md text-ink-600">
        You don&apos;t have an active internet connection right now. Pages you haven&apos;t visited
        yet cannot be loaded, but your local cooking sessions and shopping lists remain available.
      </p>

      {reconnectFailed && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 rounded-2xl bg-error-100 px-4 py-2.5 text-sm text-error-700"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>Still offline. We will reconnect automatically when signal returns.</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className={`${buttonClasses({ variant: "primary", size: "md" })} inline-flex items-center gap-2`}
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
          {checking ? "Checking..." : "Try Reconnecting"}
        </button>

        <Link href="/" className={buttonClasses({ variant: "secondary", size: "md" })}>
          Go Home
        </Link>
      </div>

      {/* Available Offline Actions */}
      <div className="mt-10 w-full space-y-3 text-left">
        <h2 className="text-[0.8125rem] font-semibold uppercase tracking-wider text-ink-500">
          Available on this device
        </h2>

        {activeSession ? (
          <Link
            href={`/cook/${activeSession.id}`}
            className="flex items-center justify-between rounded-2xl bg-primary-100 p-4 transition-colors hover:bg-primary-200"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-ink-900">
                <CookingPot size={20} />
              </span>
              <div>
                <div className="font-medium text-ink-900">Resume Active Cooking Session</div>
                <div className="text-xs text-ink-600">
                  Step {activeSession.currentStepIndex + 1} · Timers & steps are active
                </div>
              </div>
            </div>
            <ArrowRight size={18} className="text-ink-500" />
          </Link>
        ) : null}

        <Link
          href="/lists"
          className="flex items-center justify-between rounded-2xl bg-surface-100 p-4 transition-colors hover:bg-surface-200"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink-700">
              <ShoppingBasket size={20} />
            </span>
            <div>
              <div className="font-medium text-ink-900">Shopping List</div>
              <div className="text-xs text-ink-600">
                {shoppingList?.items?.length
                  ? `${shoppingList.items.length} items saved locally`
                  : "View or check off items"}
              </div>
            </div>
          </div>
          <ArrowRight size={18} className="text-ink-500" />
        </Link>
      </div>
    </div>
  );
}
