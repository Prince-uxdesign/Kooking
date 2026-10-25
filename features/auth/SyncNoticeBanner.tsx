"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Cloud, CloudCheck, X } from "lucide-react";
import { useAuth } from "./AuthContext";

export function SyncNoticeBanner() {
  const { status } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (status === "authenticated") {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-primary-50 px-4 py-2.5 text-[0.875rem] text-primary-800">
        <div className="flex items-center gap-2">
          <CloudCheck size={18} className="text-primary-600 shrink-0" aria-hidden />
          <span>Cross-device sync active · Your saved recipes are backed up to your account.</span>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label="Account backup notice"
      className="flex items-start justify-between gap-3 rounded-2xl bg-white card-edge p-4 text-[0.875rem]"
    >
      <div className="flex items-start gap-3">
        <Cloud size={20} className="mt-0.5 text-primary-600 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-ink-900">Sync recipes across devices</p>
          <p className="text-ink-600 leading-5">
            Your saved recipes are currently kept on this device.{" "}
            <Link
              href="/profile"
              className="font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700 rounded"
            >
              Sign in or create an account
            </Link>{" "}
            to access them anywhere.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss sync notice"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-surface-200 hover:text-ink-900"
      >
        <X size={16} aria-hidden />
      </button>
    </aside>
  );
}
