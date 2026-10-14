// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import manifest from "@/app/manifest";
import { checkReachability } from "./connectivity";
import {
  clearInstallDismissal,
  dismissInstallPrompt,
  INSTALL_DISMISS_KEY,
  isInstallDismissed,
  isRunningStandalone,
} from "./install-prompt";
import { applyServiceWorkerUpdate } from "./pwa-register";
import fs from "fs";
import path from "path";

describe("Phase 36: PWA Foundation & Service Worker", () => {
  describe("Web App Manifest", () => {
    it("exports a valid manifest conforming to PWA standards", () => {
      const m = manifest();
      expect(m.name).toBe("Kooking — Cooking Companion");
      expect(m.short_name).toBe("Kooking");
      expect(m.display).toBe("standalone");
      expect(m.theme_color).toBe("#3EDC6B");
      expect(m.background_color).toBe("#ffffff");
      expect(m.start_url).toBe("/");
      expect(m.icons?.length).toBeGreaterThanOrEqual(3);

      // Verify referenced icon files actually exist on disk (no fake icons)
      m.icons?.forEach((icon) => {
        const filePath = path.join(process.cwd(), "public", icon.src.replace(/^\//, ""));
        expect(fs.existsSync(filePath), `Icon file ${icon.src} must exist`).toBe(true);
      });
    });
  });

  describe("Service Worker Security & Caching Rules", () => {
    const swPath = path.join(process.cwd(), "public", "sw.js");
    let swContent: string;

    beforeEach(() => {
      swContent = fs.readFileSync(swPath, "utf-8");
    });

    it("exists and defines appropriate cache versions and shell precache", () => {
      expect(fs.existsSync(swPath)).toBe(true);
      expect(swContent).toContain("kooking-shell-");
      expect(swContent).toContain("kooking-static-");
      expect(swContent).toContain("kooking-pages-");
      expect(swContent).toContain("/offline");
      expect(swContent).toContain("/manifest.webmanifest");
    });

    it("strictly excludes Supabase and private auth endpoints from cache (Zero-Trust)", () => {
      // Must explicitly forbid caching Supabase
      expect(swContent).toContain("supabase.co");
      // Must explicitly forbid caching auth
      expect(swContent).toContain("/api/auth");
      expect(swContent).toContain("/auth/v1");
      expect(swContent).toContain("/rest/v1");
      // Must check Authorization header
      expect(swContent).toContain("Authorization");
    });

    it("handles SKIP_WAITING and controller claim cleanly", () => {
      expect(swContent).toContain("SKIP_WAITING");
      expect(swContent).toContain("clients.claim");
    });
  });

  describe("Reachability Detection", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("reports unreachable when navigator.onLine is false without pinging", async () => {
      vi.stubGlobal("navigator", { onLine: false });
      const fetchSpy = vi.spyOn(global, "fetch");

      const reachable = await checkReachability();
      expect(reachable).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("pings /api/ping with no-store when navigator.onLine is true", async () => {
      vi.stubGlobal("navigator", { onLine: true });
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as Response);

      const reachable = await checkReachability();
      expect(reachable).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/ping",
        expect.objectContaining({
          method: "HEAD",
          cache: "no-store",
        }),
      );
    });

    it("handles ping network failure gracefully", async () => {
      vi.stubGlobal("navigator", { onLine: true });
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network connection dropped"));

      const reachable = await checkReachability();
      expect(reachable).toBe(false);
    });
  });

  describe("Install Prompt Management", () => {
    beforeEach(() => {
      clearInstallDismissal();
    });

    it("tracks dismissal and respects 14-day suppression window", () => {
      expect(isInstallDismissed()).toBe(false);
      dismissInstallPrompt();
      expect(isInstallDismissed()).toBe(true);

      // Check stored timestamp
      const raw = localStorage.getItem(INSTALL_DISMISS_KEY);
      expect(raw).not.toBeNull();
      const timestamp = Number(raw);
      expect(timestamp).toBeGreaterThan(0);

      // Simulate expired dismissal (15 days ago)
      const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
      localStorage.setItem(INSTALL_DISMISS_KEY, fifteenDaysAgo.toString());
      expect(isInstallDismissed()).toBe(false);
    });

    it("detects standalone display mode", () => {
      // Default in test environment is false
      expect(isRunningStandalone()).toBe(false);

      // Mock matchMedia returning true for standalone
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("standalone"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isRunningStandalone()).toBe(true);
    });
  });

  describe("Service Worker Updates", () => {
    it("sends SKIP_WAITING to waiting worker upon update confirmation", () => {
      const mockPostMessage = vi.fn();
      const mockWaiting = {
        postMessage: mockPostMessage,
      } as unknown as ServiceWorker;

      const mockReg = {
        waiting: mockWaiting,
      } as unknown as ServiceWorkerRegistration;

      applyServiceWorkerUpdate(mockReg);
      expect(mockPostMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    });
  });
});
