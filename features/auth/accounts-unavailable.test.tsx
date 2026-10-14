// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnavailableAuthAdapter, getAuthService } from "@/shared/data/auth-service";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { act, mount } from "@/shared/testing/render";
import { AuthProvider } from "./AuthContext";
import { ProfileScreen } from "./ProfileScreen";

afterEach(() => vi.unstubAllEnvs());

describe("when no account backend is configured", () => {
  it("the app's auth service is the honest 'unavailable' one, not an in-memory fake", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    // (module caches the first answer; this file's first call is the unconfigured one)
    const service = getAuthService();
    expect(service.isAvailable).toBe(false);
    expect(service).toBeInstanceOf(UnavailableAuthAdapter);
  });

  it("never creates or signs in anyone, and says why", async () => {
    const auth = new UnavailableAuthAdapter();
    expect(await auth.getSession()).toBeNull();
    const up = await auth.signUp();
    expect(up.user).toBeNull();
    expect(up.session).toBeNull();
    expect(up.error).toMatch(/aren't available/);
    const inn = await auth.signIn();
    expect(inn.session).toBeNull();
    expect((await auth.resetPassword()).success).toBe(false);
    // Signing out of nothing is harmless.
    expect((await auth.signOut()).error).toBeNull();
    // Subscribing is safe and returns a working unsubscribe.
    expect(() => auth.onAuthStateChange()()).not.toThrow();
  });

  it("Profile explains instead of offering forms that can't work", async () => {
    const { container, unmount } = await mount(
      <AuthProvider authService={new UnavailableAuthAdapter()}>
        <main>
          <h1>Profile</h1>
          <ProfileScreen />
        </main>
      </AuthProvider>,
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Accounts aren't available yet");
    expect(container.textContent).toContain("everything works without an account");
    // No sign-in / sign-up controls at all, and the local sections remain.
    expect(container.querySelector("#signin-email")).toBeNull();
    expect(container.querySelector("#tab-signup")).toBeNull();
    expect(container.textContent).toContain("Accounts are always optional");
    expect(describeViolations(await axeViolations(container))).toEqual([]);
    await unmount();
  });
});
