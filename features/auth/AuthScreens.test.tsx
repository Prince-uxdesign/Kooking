// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import React from "react";
import { mount, act } from "@/shared/testing/render";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { MemoryAuthAdapter } from "@/shared/data/auth-service";
import { AuthProvider } from "./AuthContext";
import { ProfileScreen } from "./ProfileScreen";
import { SyncNoticeBanner } from "./SyncNoticeBanner";
import { SignInForm, SignUpForm, ForgotPasswordForm } from "./AuthForms";

describe("ProfileScreen & Auth flows", () => {
  it("renders anonymous profile with tabs and informational note", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <ProfileScreen />
      </AuthProvider>,
    );

    // Allow session check to settle
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Accounts are always optional");
    expect(container.textContent).toContain("Sign in");
    expect(container.textContent).toContain("Create account");

    const emailInput = container.querySelector("#signin-email") as HTMLInputElement;
    expect(emailInput).not.toBeNull();
    expect(emailInput.type).toBe("email");
    expect(emailInput.getAttribute("autocomplete")).toBe("username");

    const passInput = container.querySelector("#signin-password") as HTMLInputElement;
    expect(passInput).not.toBeNull();
    expect(passInput.type).toBe("password");

    await unmount();
  });

  it("switches tabs between Sign In and Create Account", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <ProfileScreen />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const createTab = container.querySelector("#tab-signup") as HTMLButtonElement;
    expect(createTab).not.toBeNull();

    await act(async () => {
      createTab.click();
    });

    expect(container.querySelector("#signup-email")).not.toBeNull();
    expect(container.querySelector("#signup-password")).not.toBeNull();
    expect(container.textContent).toContain("Create account");

    await unmount();
  });

  it("toggles password visibility with accessible button", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <SignInForm />
      </AuthProvider>,
    );

    const passInput = container.querySelector("#signin-password") as HTMLInputElement;
    expect(passInput.type).toBe("password");

    const toggleBtn = container.querySelector(
      'button[aria-label="Show password"]',
    ) as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      toggleBtn.click();
    });

    expect(passInput.type).toBe("text");
    expect(toggleBtn.getAttribute("aria-label")).toBe("Hide password");
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");

    await unmount();
  });

  it("validates form inputs before submission", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <SignInForm />
      </AuthProvider>,
    );

    const form = container.querySelector("form") as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain("Please enter your email address");

    await unmount();
  });

  it("handles user signup, displays authenticated view, and handles signout", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <ProfileScreen />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    // Switch to Sign up tab
    const createTab = container.querySelector("#tab-signup") as HTMLButtonElement;
    await act(async () => {
      createTab.click();
    });

    const emailInput = container.querySelector("#signup-email") as HTMLInputElement;
    const passInput = container.querySelector("#signup-password") as HTMLInputElement;
    const form = container.querySelector("form") as HTMLFormElement;

    function changeInput(input: HTMLInputElement, value: string) {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      if (setter) {
        setter.call(input, value);
      } else {
        input.value = value;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Fill inputs
    await act(async () => {
      changeInput(emailInput, "chef@example.com");
      changeInput(passInput, "secretpass123");
    });

    await act(async () => {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    // Should transition to Authenticated Profile
    expect(container.textContent).toContain("chef@example.com");
    expect(container.textContent).toContain("Account-Backed Data");
    expect(container.textContent).toContain("Device-Local Data");

    // Sign out
    const signOutBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Sign out"),
    );
    expect(signOutBtn).toBeDefined();

    await act(async () => {
      signOutBtn!.click();
    });

    expect(container.textContent).toContain("Accounts are always optional");

    await unmount();
  });

  it("restores active session seamlessly on mount without flashing", async () => {
    const adapter = new MemoryAuthAdapter({
      accessToken: "existing-token",
      expiresAt: Date.now() + 3600_000,
      user: {
        id: "usr-pre",
        email: "preloaded@example.com",
        createdAt: Date.now() - 100_000,
      },
    });

    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <ProfileScreen />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("preloaded@example.com");
    expect(container.textContent).toContain("Member since");

    await unmount();
  });
});

describe("SyncNoticeBanner", () => {
  it("renders non-intrusive notice for anonymous users and allows dismissal", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <SyncNoticeBanner />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Sync recipes across devices");

    const dismissBtn = container.querySelector(
      'button[aria-label="Dismiss sync notice"]',
    ) as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();

    await act(async () => {
      dismissBtn.click();
    });

    expect(container.textContent).not.toContain("Sync recipes across devices");

    await unmount();
  });

  it("shows active sync indicator for authenticated users", async () => {
    const adapter = new MemoryAuthAdapter({
      accessToken: "valid-tok",
      expiresAt: Date.now() + 3600_000,
      user: {
        id: "usr-1",
        email: "chef@example.com",
        createdAt: Date.now(),
      },
    });

    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <SyncNoticeBanner />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Cross-device sync active");

    await unmount();
  });
});

describe("accessibility (Axe audits)", () => {
  it("has no axe violations on anonymous profile", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <ProfileScreen />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const violations = await axeViolations(container);
    expect(describeViolations(violations)).toEqual([]);

    await unmount();
  });

  it("has no axe violations on authenticated profile", async () => {
    const adapter = new MemoryAuthAdapter({
      accessToken: "tok",
      expiresAt: Date.now() + 3600_000,
      user: {
        id: "usr-1",
        email: "chef@example.com",
        displayName: "Chef Tunde",
        createdAt: Date.now(),
      },
    });

    const { container, unmount } = await mount(
      <AuthProvider authService={adapter}>
        <ProfileScreen />
      </AuthProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const violations = await axeViolations(container);
    expect(describeViolations(violations)).toEqual([]);

    await unmount();
  });

  it("has no axe violations on SignUp and ForgotPassword forms", async () => {
    const adapter = new MemoryAuthAdapter();
    const { container: upContainer, unmount: unmountUp } = await mount(
      <AuthProvider authService={adapter}>
        <SignUpForm />
      </AuthProvider>,
    );
    expect(describeViolations(await axeViolations(upContainer))).toEqual([]);
    await unmountUp();

    const { container: forgotContainer, unmount: unmountForgot } = await mount(
      <AuthProvider authService={adapter}>
        <ForgotPasswordForm />
      </AuthProvider>,
    );
    expect(describeViolations(await axeViolations(forgotContainer))).toEqual([]);
    await unmountForgot();
  });
});
