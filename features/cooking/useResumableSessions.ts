"use client";

import { useCallback, useEffect, useState } from "react";
import { LocalSessions } from "@/shared/data/local";
import {
  resumeSummary,
  salvageSession,
  type ResumeSummary,
  type Salvage,
} from "@/shared/domain/recovery";

const sessions = new LocalSessions();

export interface ResumableState {
  loaded: boolean;
  /** Unfinished sessions, most recently used first. */
  summaries: ResumeSummary[];
  /** Saved sessions that failed validation (each opens a recovery screen). */
  damaged: Array<{ id: string | null; salvage: Salvage | null }>;
}

/**
 * Unfinished cooking sessions on this device, re-read when another tab
 * changes them, when the page becomes visible again, and every second
 * while a timer is running (so "4:12 left" stays true at a glance).
 */
export function useResumableSessions(): ResumableState {
  const [state, setState] = useState<ResumableState>({ loaded: false, summaries: [], damaged: [] });

  const load = useCallback(async () => {
    try {
      const [open, damaged] = await Promise.all([sessions.listResumable(), sessions.listDamaged()]);
      const now = Date.now();
      setState({
        loaded: true,
        summaries: open.map((s) => resumeSummary(s, now)),
        damaged: damaged.map((raw) => ({
          id:
            typeof raw === "object" &&
            raw !== null &&
            typeof (raw as { id?: unknown }).id === "string"
              ? (raw as { id: string }).id
              : null,
          salvage: salvageSession(raw),
        })),
      });
    } catch {
      setState({ loaded: true, summaries: [], damaged: [] });
    }
  }, []);

  useEffect(() => {
    void load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("kooking:sessions")) void load();
    };
    const onVisible = () => document.visibilityState === "visible" && void load();
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", load);
    };
  }, [load]);

  const ticking = state.summaries.some((s) => s.timers.some((t) => t.state === "running"));
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => void load(), 1000);
    return () => clearInterval(id);
  }, [ticking, load]);

  return state;
}
