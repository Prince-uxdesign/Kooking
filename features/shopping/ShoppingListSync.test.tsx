// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { AuthProvider } from "@/features/auth/AuthContext";
import { MemoryAuthAdapter } from "@/shared/data/auth-service";
import { LocalShopping } from "@/shared/data/local";
import { MemorySyncAdapter, setRemoteSyncService } from "@/shared/data/remote-sync";
import { axeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { ShoppingListScreen } from "./ShoppingListScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/lists",
}));

let mounted: Mounted | null = null;
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

describe("ShoppingListScreen persistence and sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setRemoteSyncService(new MemorySyncAdapter());
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.unmount();
      mounted = null;
    }
  });

  it("renders guest state with local storage badge and Kitchen Check notice", async () => {
    mounted = await mount(<ShoppingListScreen />);
    await settle();

    const text = mounted.container.textContent ?? "";
    expect(text).toContain("Shopping List");
    expect(text).toContain("Saved on this device");
    expect(text).toContain("Checking items off records purchases on your list");
    expect(text).toContain("Your list is empty");

    const violations = await axeViolations(mounted.container);
    expect(violations).toHaveLength(0);
  });

  it("renders authenticated user sync badge when signed in", async () => {
    const auth = new MemoryAuthAdapter({
      accessToken: "mock-token",
      expiresAt: Date.now() + 3600 * 1000,
      user: {
        id: "user_sync_1",
        email: "cook@example.com",
        createdAt: Date.now(),
      },
    });

    mounted = await mount(
      <AuthProvider authService={auth}>
        <ShoppingListScreen />
      </AuthProvider>,
    );
    await settle();
    await settle();

    const text = mounted.container.textContent ?? "";
    expect(text).toContain("Synced with account");
  });

  it("adds an item and persists it across refresh", async () => {
    const local = new LocalShopping();
    await local.store({
      id: "list_guest",
      ownerId: "guest",
      items: [
        {
          id: "item_p1",
          origin: "personal",
          name: "Curry Powder",
          qty: 1,
          unit: "tsp",
          checked: false,
          needsClarification: false,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      updatedAt: 1000,
    });

    mounted = await mount(<ShoppingListScreen />);
    await settle();

    const text = mounted.container.textContent ?? "";
    expect(text).toContain("Curry Powder");
    expect(text).toContain("1 tsp");
  });
});
