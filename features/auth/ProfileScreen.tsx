"use client";

import React, { useState } from "react";
import { CloudCheck, HardDrive, KeyRound, LogOut, ShieldCheck, Sparkles, User } from "lucide-react";
import { useAuth } from "./AuthContext";
import { ForgotPasswordForm, SignInForm, SignUpForm } from "./AuthForms";
import { CookingHistorySection } from "./CookingHistorySection";
import { CookingPreferencesSection } from "./CookingPreferencesSection";

export function ProfileScreen() {
  const { status, user, isRestoring, isAvailable, isCloudBacked, signOut } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [signingOut, setSigningOut] = useState(false);

  // Avoid flashing while restoring the session
  if (isRestoring) {
    return (
      <div className="flex flex-col gap-4 py-8 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-surface-100" />
        <div className="h-4 w-72 rounded-lg bg-surface-100" />
        <div className="h-64 rounded-3xl bg-surface-100 mt-4" />
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Authenticated Profile View
  // ------------------------------------------------------------------
  if (status === "authenticated" && user) {
    const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });

    const handleSignOut = async () => {
      setSigningOut(true);
      await signOut();
      setSigningOut(false);
    };

    return (
      <div className="flex flex-col gap-6">
        {/* User Card */}
        <div className="flex flex-col gap-4 rounded-3xl bg-white card-edge p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <User size={28} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[1.125rem] font-semibold text-ink-900">
                {user.displayName || user.email}
              </h2>
              <p className="truncate text-[0.875rem] text-ink-500">
                {user.displayName ? user.email : `Member since ${joinedDate}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 ">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[0.8125rem] font-medium text-primary-700">
              <CloudCheck size={16} aria-hidden />
              {isCloudBacked ? "Cloud Backup Active" : "Local Account Active"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-[0.8125rem] text-ink-600">
              <ShieldCheck size={16} aria-hidden />
              Zero-Trust RLS Protected
            </span>
          </div>
        </div>

        {/* Cooking Preferences */}
        <CookingPreferencesSection userId={user.id} isAuthenticated={true} />

        {/* Cooking History */}
        <CookingHistorySection userId={user.id} isAuthenticated={true} />

        {/* Data Isolation & Storage Breakdown */}
        <div className="flex flex-col gap-3 rounded-3xl bg-white card-edge p-6">
          <h2 className="text-[1rem] font-semibold text-ink-900">Storage & Data Isolation</h2>
          <p className="text-[0.875rem] leading-6 text-ink-600">
            Fork isolates your data clearly between cloud-synced records and private device state:
          </p>
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl bg-surface-100 p-4">
              <CloudCheck size={20} className="mt-0.5 shrink-0 text-primary-600" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[0.875rem] font-medium text-ink-900">Account-Backed Data</h3>
                <p className="text-[0.8125rem] leading-5 text-ink-600">
                  Saved recipe bookmarks, shopping lists, cooking history, and default portion
                  preferences sync safely across devices with Row Level Security.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-surface-100 p-4">
              <HardDrive size={20} className="mt-0.5 shrink-0 text-ink-500" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[0.875rem] font-medium text-ink-900">Device-Local Data</h3>
                <p className="text-[0.8125rem] leading-5 text-ink-600">
                  Active cooking timers, Kitchen Check inventory answers, and recent recipe views
                  stay private on this device to prevent network lag or false inventory assumptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out Section */}
        <div className="flex flex-col gap-3 rounded-3xl bg-white card-edge p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[1rem] font-semibold text-ink-900">Sign out</h2>
            <p className="text-[0.875rem] leading-5 text-ink-600">
              Signing out safely clears your account data from this device and returns to guest
              mode. Your account data remains securely stored in the cloud.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-surface-100 px-6 text-[0.9375rem] font-medium text-error-700 transition-colors hover:bg-error-100"
          >
            <LogOut size={18} aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Anonymous / Guest View with Optional Auth
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* Informational Guidance Banner */}
      <div className="flex flex-col gap-3 rounded-3xl bg-primary-100 p-6">
        <div className="flex items-center gap-2 text-primary-800 font-semibold text-[1rem]">
          <Sparkles size={20} className="text-primary-600" aria-hidden />
          <span>Accounts are always optional</span>
        </div>
        <p className="text-[0.875rem] leading-6 text-ink-700">
          You don&apos;t need an account to browse recipes, search, use Kitchen Check, or cook in
          Cooking Mode. Everything works immediately as a guest.
        </p>
        <div className="flex items-center gap-2 text-[0.8125rem] text-ink-600">
          <KeyRound size={16} className="text-ink-500 shrink-0" aria-hidden />
          <span>
            Create or sign in to an account if you want cross-device backup for your saved recipes,
            shopping list, and cooking history.
          </span>
        </div>
      </div>

      {/* Cooking Preferences (Guest / Local) */}
      <CookingPreferencesSection userId={null} isAuthenticated={false} />

      {/* Cooking History (Guest / Local) */}
      <CookingHistorySection userId={null} isAuthenticated={false} />

      {!isAvailable && (
        <div role="note" className="flex flex-col gap-2 rounded-3xl bg-white card-edge p-6">
          <h2 className="text-[1.0625rem] font-semibold text-ink-900">
            Accounts aren&apos;t available yet
          </h2>
          <p className="text-[0.9375rem] leading-6 text-ink-600">
            Backup and sync across devices isn&apos;t set up in this version of Fork. Your saved
            recipes, shopping list and cooking history stay on this device, and everything works
            without an account.
          </p>
        </div>
      )}

      {/* Auth Card with Tabs */}
      {isAvailable && (
        <div className="rounded-3xl bg-white card-edge p-6">
          {/* Tab switcher */}
          {tab !== "forgot" ? (
            <div
              role="tablist"
              aria-label="Account options"
              className="flex rounded-2xl bg-surface-100 p-1 mb-6"
            >
              <button
                type="button"
                role="tab"
                id="tab-signin"
                aria-selected={tab === "signin"}
                aria-controls="panel-signin"
                onClick={() => setTab("signin")}
                className={`flex-1 min-h-[40px] rounded-xl text-[0.875rem] font-medium transition-colors ${
                  tab === "signin"
                    ? "bg-surface-100 text-ink-900"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                id="tab-signup"
                aria-selected={tab === "signup"}
                aria-controls="panel-signup"
                onClick={() => setTab("signup")}
                className={`flex-1 min-h-[40px] rounded-xl text-[0.875rem] font-medium transition-colors ${
                  tab === "signup"
                    ? "bg-surface-100 text-ink-900"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                Create account
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-6 pb-4">
              <h2 className="text-[1.125rem] font-semibold text-ink-900">Reset your password</h2>
              <button
                type="button"
                onClick={() => setTab("signin")}
                className="text-[0.8125rem] font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
              >
                Back to Sign in
              </button>
            </div>
          )}

          {/* Tab panels */}
          {tab === "signin" && (
            <div id="panel-signin" role="tabpanel" aria-labelledby="tab-signin">
              <SignInForm
                onSwitchToSignUp={() => setTab("signup")}
                onSwitchToForgot={() => setTab("forgot")}
              />
            </div>
          )}

          {tab === "signup" && (
            <div id="panel-signup" role="tabpanel" aria-labelledby="tab-signup">
              <SignUpForm onSwitchToSignIn={() => setTab("signin")} />
            </div>
          )}

          {tab === "forgot" && (
            <div>
              <ForgotPasswordForm onBackToSignIn={() => setTab("signin")} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
