import {
  formatAuthError,
  isSessionExpired,
  validateEmail,
  validatePassword,
  type AuthSession,
  type AuthUser,
} from "@/shared/domain/auth";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export interface AuthResult {
  session: AuthSession | null;
  user: AuthUser | null;
  requiresVerification?: boolean;
  error: string | null;
}

export interface PasswordResetResult {
  success: boolean;
  error: string | null;
}

export interface AuthPort {
  /** Accounts can be created and signed in to (false when no backend is configured). */
  readonly isAvailable: boolean;
  readonly isCloudBacked: boolean;
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<{ error: string | null }>;
  resetPassword(email: string): Promise<PasswordResetResult>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}

/* ------------------------------------------------------------------ */
/* Supabase adapter                                                   */
/* ------------------------------------------------------------------ */

export class SupabaseAuthAdapter implements AuthPort {
  readonly isAvailable = true;
  readonly isCloudBacked = true;

  async getSession(): Promise<AuthSession | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return null;

      const user = data.session.user;
      const expiresAt = data.session.expires_at
        ? data.session.expires_at * 1000
        : Date.now() + 3600 * 1000;

      const session: AuthSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt,
        user: {
          id: user.id,
          email: user.email ?? "",
          displayName: user.user_metadata?.full_name ?? undefined,
          createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
        },
      };

      if (isSessionExpired(session, Date.now())) {
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return { session: null, user: null, error: emailVal.error! };
    }
    const passVal = validatePassword(password);
    if (!passVal.valid) {
      return { session: null, user: null, error: passVal.error! };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { session: null, user: null, error: "Authentication service is unavailable." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { session: null, user: null, error: formatAuthError(error) };
      }

      if (!data.session || !data.user) {
        return { session: null, user: null, error: "Sign in could not be completed." };
      }

      const session: AuthSession = {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at
          ? data.session.expires_at * 1000
          : Date.now() + 3600 * 1000,
        user: {
          id: data.user.id,
          email: data.user.email ?? email.trim(),
          displayName: data.user.user_metadata?.full_name ?? undefined,
          createdAt: data.user.created_at ? new Date(data.user.created_at).getTime() : Date.now(),
        },
      };

      return { session, user: session.user, error: null };
    } catch (err) {
      return { session: null, user: null, error: formatAuthError(err) };
    }
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return { session: null, user: null, error: emailVal.error! };
    }
    const passVal = validatePassword(password);
    if (!passVal.valid) {
      return { session: null, user: null, error: passVal.error! };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { session: null, user: null, error: "Authentication service is unavailable." };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        return { session: null, user: null, error: formatAuthError(error) };
      }

      if (!data.user) {
        return { session: null, user: null, error: "Sign up could not be completed." };
      }

      const user: AuthUser = {
        id: data.user.id,
        email: data.user.email ?? email.trim(),
        displayName: data.user.user_metadata?.full_name ?? undefined,
        createdAt: data.user.created_at ? new Date(data.user.created_at).getTime() : Date.now(),
      };

      // In Supabase, if email confirmation is enabled, session may be null until confirmed
      let session: AuthSession | null = null;
      if (data.session) {
        session = {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at
            ? data.session.expires_at * 1000
            : Date.now() + 3600 * 1000,
          user,
        };
      }

      return {
        session,
        user,
        requiresVerification: session === null,
        error: null,
      };
    } catch (err) {
      return { session: null, user: null, error: formatAuthError(err) };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: null };

    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: formatAuthError(error) };
      return { error: null };
    } catch (err) {
      return { error: formatAuthError(err) };
    }
  }

  async resetPassword(email: string): Promise<PasswordResetResult> {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return { success: false, error: emailVal.error! };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: "Authentication service is unavailable." };
    }

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) {
        return { success: false, error: formatAuthError(error) };
      }
      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: formatAuthError(err) };
    }
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!supabaseSession) {
        callback(null);
        return;
      }
      const user = supabaseSession.user;
      const session: AuthSession = {
        accessToken: supabaseSession.access_token,
        refreshToken: supabaseSession.refresh_token,
        expiresAt: supabaseSession.expires_at
          ? supabaseSession.expires_at * 1000
          : Date.now() + 3600 * 1000,
        user: {
          id: user.id,
          email: user.email ?? "",
          displayName: user.user_metadata?.full_name ?? undefined,
          createdAt: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
        },
      };
      callback(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }
}

/* ------------------------------------------------------------------ */
/* In-memory adapter: a test double only, never used by the app      */
/* ------------------------------------------------------------------ */

export class MemoryAuthAdapter implements AuthPort {
  readonly isAvailable = true;
  readonly isCloudBacked = false;
  private currentSession: AuthSession | null = null;
  private users = new Map<
    string,
    { id: string; email: string; password: string; createdAt: number }
  >();
  private listeners = new Set<(s: AuthSession | null) => void>();

  constructor(initialSession: AuthSession | null = null) {
    this.currentSession = initialSession;
  }

  async getSession(): Promise<AuthSession | null> {
    if (this.currentSession && isSessionExpired(this.currentSession, Date.now())) {
      this.currentSession = null;
      this.notify();
    }
    return this.currentSession;
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) return { session: null, user: null, error: emailVal.error! };
    const passVal = validatePassword(password);
    if (!passVal.valid) return { session: null, user: null, error: passVal.error! };

    const norm = email.trim().toLowerCase();
    const existing = this.users.get(norm);
    if (!existing || existing.password !== password) {
      return {
        session: null,
        user: null,
        error: "Incorrect email or password. Please verify your details.",
      };
    }

    const user: AuthUser = {
      id: existing.id,
      email: existing.email,
      createdAt: existing.createdAt,
    };
    const session: AuthSession = {
      accessToken: `mock-token-${Date.now()}`,
      expiresAt: Date.now() + 3600 * 1000,
      user,
    };

    this.currentSession = session;
    this.notify();
    return { session, user, error: null };
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) return { session: null, user: null, error: emailVal.error! };
    const passVal = validatePassword(password);
    if (!passVal.valid) return { session: null, user: null, error: passVal.error! };

    const norm = email.trim().toLowerCase();
    if (this.users.has(norm)) {
      return {
        session: null,
        user: null,
        error: "An account with this email already exists. Try signing in instead.",
      };
    }

    const now = Date.now();
    const id = `user-${Math.random().toString(36).slice(2, 10)}`;
    this.users.set(norm, { id, email: email.trim(), password, createdAt: now });

    const user: AuthUser = { id, email: email.trim(), createdAt: now };
    const session: AuthSession = {
      accessToken: `mock-token-${now}`,
      expiresAt: now + 3600 * 1000,
      user,
    };

    this.currentSession = session;
    this.notify();
    return { session, user, requiresVerification: false, error: null };
  }

  async signOut(): Promise<{ error: string | null }> {
    this.currentSession = null;
    this.notify();
    return { error: null };
  }

  async resetPassword(email: string): Promise<PasswordResetResult> {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) return { success: false, error: emailVal.error! };
    return { success: true, error: null };
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    for (const l of this.listeners) {
      l(this.currentSession);
    }
  }

  /** Test helper to expire the active session */
  expireActiveSession(): void {
    if (this.currentSession) {
      this.currentSession = {
        ...this.currentSession,
        expiresAt: Date.now() - 1000,
      };
      this.notify();
    }
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Used when no backend is configured. It never pretends: there is no
 * session, and every attempt says plainly that accounts aren't available,
 * instead of "creating" an account that disappears on refresh.
 */
export class UnavailableAuthAdapter implements AuthPort {
  readonly isAvailable = false;
  readonly isCloudBacked = false;
  private static readonly MESSAGE =
    "Accounts aren't available in this version of Fork. Everything else works without one.";

  async getSession(): Promise<AuthSession | null> {
    return null;
  }
  async signIn(): Promise<AuthResult> {
    return { session: null, user: null, error: UnavailableAuthAdapter.MESSAGE };
  }
  async signUp(): Promise<AuthResult> {
    return { session: null, user: null, error: UnavailableAuthAdapter.MESSAGE };
  }
  async signOut(): Promise<{ error: string | null }> {
    return { error: null };
  }
  async resetPassword(): Promise<PasswordResetResult> {
    return { success: false, error: UnavailableAuthAdapter.MESSAGE };
  }
  onAuthStateChange(): () => void {
    return () => {};
  }
}

let activeAuthPort: AuthPort | null = null;

export function getAuthService(): AuthPort {
  if (activeAuthPort) return activeAuthPort;
  activeAuthPort = isSupabaseConfigured()
    ? new SupabaseAuthAdapter()
    : new UnavailableAuthAdapter();
  return activeAuthPort;
}
