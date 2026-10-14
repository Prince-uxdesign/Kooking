"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type BeforeInstallPromptEvent,
  dismissInstallPrompt,
  isInstallDismissed,
  isRunningStandalone,
} from "./install-prompt";
import {
  applyServiceWorkerUpdate,
  onServiceWorkerUpdate,
  registerServiceWorker,
} from "./pwa-register";
import { useConnectivity, type ConnectivityState } from "./useConnectivity";

export interface PwaContextValue extends ConnectivityState {
  isInstallable: boolean;
  isStandalone: boolean;
  showInstallBanner: boolean;
  promptInstall: () => Promise<boolean>;
  dismissInstall: () => void;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const connectivity = useConnectivity();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingReg, setWaitingReg] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 1. Initial standalone check
    setIsStandalone(isRunningStandalone());
    setIsDismissed(isInstallDismissed());

    // 2. Service worker registration
    void registerServiceWorker();

    const unsubUpdate = onServiceWorkerUpdate((reg) => {
      setWaitingReg(reg);
      setUpdateAvailable(true);
    });

    // 3. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      // Prevent automatic browser mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      unsubUpdate();
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
        return true;
      } else {
        dismissInstallPrompt();
        setIsDismissed(true);
        return false;
      }
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback(() => {
    dismissInstallPrompt();
    setIsDismissed(true);
  }, []);

  const applyUpdate = useCallback(() => {
    applyServiceWorkerUpdate(waitingReg);
  }, [waitingReg]);

  const isInstallable = Boolean(deferredPrompt) && !isStandalone;
  const showInstallBanner = isInstallable && !isDismissed;

  const value = useMemo<PwaContextValue>(
    () => ({
      ...connectivity,
      isInstallable,
      isStandalone,
      showInstallBanner,
      promptInstall,
      dismissInstall,
      updateAvailable,
      applyUpdate,
    }),
    [
      connectivity,
      isInstallable,
      isStandalone,
      showInstallBanner,
      promptInstall,
      dismissInstall,
      updateAvailable,
      applyUpdate,
    ],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const ctx = useContext(PwaContext);
  if (!ctx) {
    // Safe fallback if used outside provider
    return {
      isOnline: true,
      isServerReachable: true,
      wasOffline: false,
      isInstallable: false,
      isStandalone: false,
      showInstallBanner: false,
      promptInstall: async () => false,
      dismissInstall: () => {},
      updateAvailable: false,
      applyUpdate: () => {},
    };
  }
  return ctx;
}
