"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthSession, AuthStatus, AuthUser } from "@/shared/domain/auth";
import { getAuthService, type AuthPort } from "@/shared/data/auth-service";
import { clearAccountLocalData } from "@/shared/data/local";
import { logger } from "@/shared/data/logger";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  session: AuthSession | null;
  error: string | null;
  isRestoring: boolean;
  isCloudBacked: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; requiresVerification?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  authService?: AuthPort;
}

export function AuthProvider({ children, authService }: AuthProviderProps) {
  const service = authService ?? getAuthService();
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore session once on mount
  useEffect(() => {
    let mounted = true;

    service
      .getSession()
      .then((existingSession) => {
        if (!mounted) return;
        if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          setStatus("authenticated");
        } else {
          setSession(null);
          setUser(null);
          setStatus("anonymous");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        logger.error("AuthContext.restore", err);
        setSession(null);
        setUser(null);
        setStatus("anonymous");
      })
      .finally(() => {
        if (mounted) {
          setIsRestoring(false);
        }
      });

    const unsubscribe = service.onAuthStateChange((newSession) => {
      if (!mounted) return;
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        setStatus("authenticated");
      } else {
        setSession(null);
        setUser(null);
        setStatus("anonymous");
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [service]);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      setStatus("signing_in");
      const res = await service.signIn(email, password);
      if (res.error) {
        setError(res.error);
        setStatus("error");
        return false;
      }
      if (res.session) {
        setSession(res.session);
        setUser(res.user);
        setStatus("authenticated");
        return true;
      }
      setStatus("anonymous");
      return false;
    },
    [service],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; requiresVerification?: boolean }> => {
      setError(null);
      setStatus("signing_in");
      const res = await service.signUp(email, password);
      if (res.error) {
        setError(res.error);
        setStatus("error");
        return { success: false };
      }
      if (res.session) {
        setSession(res.session);
        setUser(res.user);
        setStatus("authenticated");
        return { success: true, requiresVerification: false };
      }
      // If requiresVerification is true, user was created but needs email confirmation
      setStatus("anonymous");
      return { success: true, requiresVerification: res.requiresVerification };
    },
    [service],
  );

  const signOut = useCallback(async () => {
    setError(null);
    setStatus("signing_out");
    const currentUserId = user?.id;
    await service.signOut();
    clearAccountLocalData(currentUserId);
    setSession(null);
    setUser(null);
    setStatus("anonymous");
  }, [service, user?.id]);

  const resetPassword = useCallback(
    async (email: string): Promise<boolean> => {
      setError(null);
      const res = await service.resetPassword(email);
      if (res.error) {
        setError(res.error);
        return false;
      }
      return true;
    },
    [service],
  );

  const value: AuthContextValue = {
    status,
    user,
    session,
    error,
    isRestoring,
    isCloudBacked: service.isCloudBacked,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
