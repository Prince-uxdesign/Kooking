"use client";

import { useEffect, useState } from "react";
import { checkReachability } from "./connectivity";

export interface ConnectivityState {
  isOnline: boolean;
  isServerReachable: boolean;
  wasOffline: boolean;
}

/**
 * Hook to observe network connectivity and actual server reachability.
 * Provides a transient `wasOffline` signal when transitioning back online.
 */
export function useConnectivity(): ConnectivityState {
  // Node 21+ defines `navigator` without `onLine`, so the server must not read it.
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") return navigator.onLine;
    return true;
  });

  const [isServerReachable, setIsServerReachable] = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    async function verify() {
      const online = typeof navigator !== "undefined" ? navigator.onLine : true;
      if (!online) {
        if (active) {
          setIsOnline(false);
          setIsServerReachable(false);
          setWasOffline(true);
        }
        return;
      }

      setIsOnline(true);
      const reachable = await checkReachability();
      if (!active) return;

      setIsServerReachable(reachable);
      if (!reachable) {
        setWasOffline(true);
      }
    }

    void verify();

    const handleOnline = () => {
      void verify();
    };

    const handleOffline = () => {
      if (active) {
        setIsOnline(false);
        setIsServerReachable(false);
        setWasOffline(true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void verify();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodically verify connection (every 30s)
    const interval = setInterval(() => {
      void verify();
    }, 30000);

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    isServerReachable,
    wasOffline,
  };
}
