"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { validateEmail, validatePassword } from "@/shared/domain/auth";
import { useAuth } from "./AuthContext";

const inputClass =
  "w-full rounded-2xl border border-line-default bg-surface-primary px-4 py-3 text-[1rem] leading-6 text-ink-900 placeholder:text-ink-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20";
const labelClass = "block text-[0.875rem] font-medium text-ink-700 mb-1.5";
const buttonClass =
  "inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-primary-500 px-6 text-[1rem] font-medium text-ink-900 transition-colors hover:bg-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Sign In Form                                                       */
/* ------------------------------------------------------------------ */

export interface SignInFormProps {
  onSwitchToSignUp?: () => void;
  onSwitchToForgot?: () => void;
  onSuccess?: () => void;
}

export function SignInForm({ onSwitchToSignUp, onSwitchToForgot, onSuccess }: SignInFormProps) {
  const { signIn, error, clearError, isCloudBacked } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setValidationError(emailCheck.error!);
      return;
    }
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      setValidationError(passCheck.error!);
      return;
    }

    setLoading(true);
    const ok = await signIn(email, password);
    setLoading(false);
    if (ok && onSuccess) {
      onSuccess();
    }
  };

  const activeError = validationError || error;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl bg-error-50 p-3.5 text-[0.875rem] leading-5 text-error-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>{activeError}</span>
        </div>
      )}

      <div>
        <label htmlFor="signin-email" className={labelClass}>
          Email address
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (activeError) {
              setValidationError(null);
              clearError();
            }
          }}
          placeholder="e.g. cook@example.com"
          className={inputClass}
          disabled={loading}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="signin-password" className="text-[0.875rem] font-medium text-ink-700">
            Password
          </label>
          {onSwitchToForgot && (
            <button
              type="button"
              onClick={onSwitchToForgot}
              className="text-[0.8125rem] font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
            >
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <input
            id="signin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (activeError) {
                setValidationError(null);
                clearError();
              }
            }}
            placeholder="At least 8 characters"
            className={`${inputClass} pr-12`}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-ink-400 hover:text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} className={`${buttonClass} mt-2`}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" aria-hidden />
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </button>

      {!isCloudBacked && (
        <p className="text-center text-[0.8125rem] text-ink-500">
          Running in offline-friendly mode. Credentials stay on this device.
        </p>
      )}

      {onSwitchToSignUp && (
        <p className="text-center text-[0.875rem] text-ink-600 mt-2">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Create an account
          </button>
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Sign Up Form                                                       */
/* ------------------------------------------------------------------ */

export interface SignUpFormProps {
  onSwitchToSignIn?: () => void;
  onSuccess?: () => void;
}

export function SignUpForm({ onSwitchToSignIn, onSuccess }: SignUpFormProps) {
  const { signUp, error, clearError, isCloudBacked } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setValidationError(emailCheck.error!);
      return;
    }
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      setValidationError(passCheck.error!);
      return;
    }

    setLoading(true);
    const res = await signUp(email, password);
    setLoading(false);

    if (res.success) {
      if (res.requiresVerification) {
        setVerificationNotice(true);
      } else if (onSuccess) {
        onSuccess();
      }
    }
  };

  if (verificationNotice) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-secondary p-6 text-center">
        <CheckCircle2 size={36} className="text-primary-600" aria-hidden />
        <h3 className="text-[1.125rem] font-semibold text-ink-900">Check your email</h3>
        <p className="text-[0.875rem] leading-6 text-ink-600">
          We sent a verification link to <strong className="text-ink-900">{email}</strong>. Click
          the link in the email to activate your account and start syncing.
        </p>
        {onSwitchToSignIn && (
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="mt-2 text-[0.875rem] font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
          >
            Back to Sign in
          </button>
        )}
      </div>
    );
  }

  const activeError = validationError || error;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl bg-error-50 p-3.5 text-[0.875rem] leading-5 text-error-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>{activeError}</span>
        </div>
      )}

      <div>
        <label htmlFor="signup-email" className={labelClass}>
          Email address
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (activeError) {
              setValidationError(null);
              clearError();
            }
          }}
          placeholder="e.g. cook@example.com"
          className={inputClass}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="signup-password" className={labelClass}>
          Choose password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (activeError) {
                setValidationError(null);
                clearError();
              }
            }}
            placeholder="At least 8 characters"
            className={`${inputClass} pr-12`}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-ink-400 hover:text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
        <p className="mt-1 text-[0.8125rem] text-ink-500">
          Must be at least 8 characters. Used to secure your recipe backup.
        </p>
      </div>

      <button type="submit" disabled={loading} className={`${buttonClass} mt-2`}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" aria-hidden />
            Creating account…
          </span>
        ) : (
          "Create account"
        )}
      </button>

      {!isCloudBacked && (
        <p className="text-center text-[0.8125rem] text-ink-500">
          Running in offline-friendly mode. Credentials stay on this device.
        </p>
      )}

      {onSwitchToSignIn && (
        <p className="text-center text-[0.875rem] text-ink-600 mt-2">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Sign in
          </button>
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Forgot Password Form                                               */
/* ------------------------------------------------------------------ */

export interface ForgotPasswordFormProps {
  onBackToSignIn?: () => void;
}

export function ForgotPasswordForm({ onBackToSignIn }: ForgotPasswordFormProps) {
  const { resetPassword, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setValidationError(emailCheck.error!);
      return;
    }

    setLoading(true);
    const ok = await resetPassword(email);
    setLoading(false);
    if (ok) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-secondary p-6 text-center">
        <CheckCircle2 size={36} className="text-primary-600" aria-hidden />
        <h3 className="text-[1.125rem] font-semibold text-ink-900">Reset email sent</h3>
        <p className="text-[0.875rem] leading-6 text-ink-600">
          If an account exists for <strong className="text-ink-900">{email}</strong>, we sent a
          password reset link. Check your inbox to choose a new password.
        </p>
        {onBackToSignIn && (
          <button
            type="button"
            onClick={onBackToSignIn}
            className="mt-2 text-[0.875rem] font-medium text-primary-600 underline underline-offset-2 hover:text-primary-700"
          >
            Back to Sign in
          </button>
        )}
      </div>
    );
  }

  const activeError = validationError || error;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl bg-error-50 p-3.5 text-[0.875rem] leading-5 text-error-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>{activeError}</span>
        </div>
      )}

      <p className="text-[0.875rem] leading-6 text-ink-600">
        Enter the email address associated with your Kooking account and we will send you a link to
        reset your password.
      </p>

      <div>
        <label htmlFor="forgot-email" className={labelClass}>
          Email address
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (activeError) {
              setValidationError(null);
              clearError();
            }
          }}
          placeholder="e.g. cook@example.com"
          className={inputClass}
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading} className={`${buttonClass} mt-2`}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" aria-hidden />
            Sending link…
          </span>
        ) : (
          "Send reset link"
        )}
      </button>

      {onBackToSignIn && (
        <p className="text-center text-[0.875rem] text-ink-600 mt-2">
          Remembered your password?{" "}
          <button
            type="button"
            onClick={onBackToSignIn}
            className="font-semibold text-primary-600 underline underline-offset-2 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          >
            Sign in
          </button>
        </p>
      )}
    </form>
  );
}
