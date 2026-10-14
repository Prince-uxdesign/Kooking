"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, History, RotateCcw, Utensils } from "lucide-react";
import Link from "next/link";
import { LocalCookingHistory } from "@/shared/data/local";
import { getRemoteSyncService } from "@/shared/data/remote-sync";
import type { CookingHistoryEntry } from "@/shared/domain/cooking-history";
import { mergeCookingHistory } from "@/shared/domain/cooking-history";

interface CookingHistorySectionProps {
  userId?: string | null;
  isAuthenticated: boolean;
}

export function CookingHistorySection({ userId, isAuthenticated }: CookingHistorySectionProps) {
  const [entries, setEntries] = useState<CookingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      const local = new LocalCookingHistory();
      const localEntries = await local.list();

      if (isAuthenticated && userId) {
        const remoteRes = await getRemoteSyncService().fetchCookingHistory(userId);
        if (!mounted) return;
        const merged = mergeCookingHistory(localEntries, remoteRes.entries);
        setEntries(merged);
      } else {
        if (!mounted) return;
        setEntries(localEntries);
      }
      setLoading(false);
    }

    void loadHistory();

    return () => {
      mounted = false;
    };
  }, [userId, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-line-default bg-surface-primary p-6">
        <div className="h-6 w-36 rounded-lg bg-surface-secondary animate-pulse" />
        <div className="h-20 rounded-2xl bg-surface-secondary animate-pulse mt-2" />
      </div>
    );
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line-default bg-surface-primary p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={20} className="text-primary-600" aria-hidden />
          <h3 className="text-[1rem] font-semibold text-ink-900">Cooking History</h3>
        </div>
        <span className="text-[0.8125rem] text-ink-500">
          {entries.length} {entries.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      <p className="text-[0.875rem] text-ink-600">
        Review your previous cooking sessions and portion sizes.
      </p>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-default bg-surface-secondary/40 py-8 px-4 text-center">
          <Utensils size={28} className="text-ink-400" aria-hidden />
          <p className="text-[0.9375rem] font-medium text-ink-800">No cooking history yet</p>
          <p className="max-w-xs text-[0.8125rem] text-ink-500 leading-5">
            When you cook a recipe in Cooking Mode, your session details and completion records will
            appear here.
          </p>
          <Link
            href="/recipes"
            className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary-600 px-5 text-[0.875rem] font-medium text-white transition-colors hover:bg-primary-700"
          >
            Find a recipe to cook
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 pt-1">
          {entries.map((entry) => {
            const isCompleted = entry.status === "completed";
            const isAbandoned = entry.status === "abandoned";

            return (
              <li
                key={entry.sessionId}
                className="flex flex-col gap-3 rounded-2xl border border-line-default bg-surface-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink-900 truncate text-[0.9375rem]">
                      {entry.recipeTitle}
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-[0.75rem] font-medium text-primary-700">
                        <CheckCircle2 size={13} aria-hidden />
                        Completed
                      </span>
                    )}
                    {isAbandoned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[0.75rem] font-medium text-amber-700">
                        Ended early
                      </span>
                    )}
                    {!isCompleted && !isAbandoned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-0.5 text-[0.75rem] text-ink-600">
                        Interrupted
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-500">
                    <span>{formatDateTime(entry.startedAt)}</span>
                    <span>·</span>
                    <span>{entry.servings} servings</span>
                    {entry.durationMinutes !== null && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} aria-hidden />
                          {entry.durationMinutes} min
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {entry.completedStepsCount} of {entry.totalStepsCount} steps
                    </span>
                  </div>
                </div>

                <Link
                  href={`/recipes/${entry.recipeSlug}`}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-line-default bg-surface-primary px-4 text-[0.8125rem] font-medium text-ink-800 transition-colors hover:bg-surface-secondary"
                >
                  <RotateCcw size={14} aria-hidden />
                  Cook again
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
