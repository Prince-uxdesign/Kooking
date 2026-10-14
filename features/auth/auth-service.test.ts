import { describe, expect, it } from "vitest";
import { MemoryAuthAdapter } from "@/shared/data/auth-service";

describe("MemoryAuthAdapter", () => {
  it("starts anonymous with no session", async () => {
    const auth = new MemoryAuthAdapter();
    expect(await auth.getSession()).toBeNull();
  });

  it("handles user signup and creates a session", async () => {
    const auth = new MemoryAuthAdapter();
    const result = await auth.signUp("chef@example.com", "password123");

    expect(result.error).toBeNull();
    expect(result.user?.email).toBe("chef@example.com");
    expect(result.session).not.toBeNull();
    expect(result.session?.accessToken).toBeDefined();

    const current = await auth.getSession();
    expect(current?.user.email).toBe("chef@example.com");
  });

  it("rejects duplicate email signup", async () => {
    const auth = new MemoryAuthAdapter();
    await auth.signUp("chef@example.com", "password123");
    const dup = await auth.signUp("chef@example.com", "anotherpass");

    expect(dup.error).toMatch(/already exists/i);
    expect(dup.session).toBeNull();
  });

  it("validates email and password constraints on signup and signin", async () => {
    const auth = new MemoryAuthAdapter();

    const badEmail = await auth.signUp("invalid-email", "password123");
    expect(badEmail.error).toMatch(/valid email/i);

    const shortPass = await auth.signUp("test@example.com", "short");
    expect(shortPass.error).toMatch(/at least 8 characters/i);

    const badSignInEmail = await auth.signIn("invalid-email", "password123");
    expect(badSignInEmail.error).toMatch(/valid email/i);
  });

  it("signs in an existing user with correct credentials", async () => {
    const auth = new MemoryAuthAdapter();
    await auth.signUp("chef@example.com", "password123");
    await auth.signOut();
    expect(await auth.getSession()).toBeNull();

    const wrong = await auth.signIn("chef@example.com", "wrongpass");
    expect(wrong.error).toMatch(/Incorrect email or password/i);
    expect(wrong.session).toBeNull();

    const ok = await auth.signIn("chef@example.com", "password123");
    expect(ok.error).toBeNull();
    expect(ok.user?.email).toBe("chef@example.com");
    expect(await auth.getSession()).not.toBeNull();
  });

  it("signs out cleanly", async () => {
    const auth = new MemoryAuthAdapter();
    await auth.signUp("chef@example.com", "password123");
    expect(await auth.getSession()).not.toBeNull();

    const res = await auth.signOut();
    expect(res.error).toBeNull();
    expect(await auth.getSession()).toBeNull();
  });

  it("handles expired sessions during restoration", async () => {
    const auth = new MemoryAuthAdapter();
    await auth.signUp("chef@example.com", "password123");
    expect(await auth.getSession()).not.toBeNull();

    auth.expireActiveSession();
    expect(await auth.getSession()).toBeNull();
  });

  it("notifies listeners on auth state change", async () => {
    const auth = new MemoryAuthAdapter();
    const states: boolean[] = [];
    const unsubscribe = auth.onAuthStateChange((s) => states.push(s !== null));

    await auth.signUp("chef@example.com", "password123");
    await auth.signOut();
    await auth.signIn("chef@example.com", "password123");
    unsubscribe();
    await auth.signOut();

    expect(states).toEqual([true, false, true]);
  });

  it("handles password reset requests with validation", async () => {
    const auth = new MemoryAuthAdapter();
    const bad = await auth.resetPassword("notanemail");
    expect(bad.success).toBe(false);

    const ok = await auth.resetPassword("chef@example.com");
    expect(ok.success).toBe(true);
    expect(ok.error).toBeNull();
  });
});
