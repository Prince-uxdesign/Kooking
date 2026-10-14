/**
 * Sanitized diagnostic logger for Kooking.
 *
 * Ensures errors, warnings, and diagnostic information can be logged
 * in development and production without leaking:
 * - JWTs, access tokens, refresh tokens, bearer headers
 * - Supabase anon keys, service keys, API secrets
 * - User passwords, secrets, or sensitive credentials
 *
 * Fails safe and never throws while attempting to log.
 */

const SECRET_PATTERNS = [
  // JWT tokens (3 base64url segments separated by dots)
  /\beyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g,
  // Bearer tokens
  /\bBearer\s+[A-Za-z0-9-_.]+/gi,
  // Supabase service / anon keys
  /\bsbp_[a-zA-Z0-9_-]+\b/g,
  // Password/token/secret parameter assignments: key=value or "key": "value"
  /([?&"'](?:access_token|refresh_token|token|password|secret|apikey|apiKey|anonKey|service_role)[=\s:"']+)([^&"'\s\n\r]+)/gi,
];

const SENSITIVE_KEY_NAMES = new Set([
  "password",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "secret",
  "apikey",
  "api_key",
  "anonkey",
  "anon_key",
  "service_role",
  "authorization",
  "cookie",
]);

/**
 * Sanitizes any string by redacting secret patterns and token signatures.
 */
export function sanitizeString(text: string): string {
  if (!text) return text;
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match, prefix, secret) => {
      if (prefix && secret) {
        return `${prefix}[REDACTED]`;
      }
      return "[REDACTED_TOKEN]";
    });
  }
  return sanitized;
}

/**
 * Deeply sanitizes an object or value, masking sensitive keys and stripping secrets.
 */
export function sanitizeValue(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      digest: (value as { digest?: string }).digest,
      stack: value.stack ? sanitizeString(value.stack) : undefined,
    };
  }

  if (typeof value !== "object") return String(value);

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  const sanitizedObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      SENSITIVE_KEY_NAMES.has(lowerKey) ||
      lowerKey.includes("token") ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("apikey") ||
      lowerKey.includes("cookie") ||
      lowerKey.includes("auth");

    if (isSensitive) {
      sanitizedObj[key] = "[REDACTED]";
    } else {
      sanitizedObj[key] = sanitizeValue(val, seen);
    }
  }
  return sanitizedObj;
}

export interface LogEntry {
  level: "info" | "warn" | "error";
  context: string;
  message: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  info(context: string, message: string, metadata?: Record<string, unknown>): void {
    const entry = this.format("info", context, message, undefined, metadata);
    console.info(
      `[${entry.timestamp}] [INFO] [${entry.context}] ${entry.message}`,
      entry.metadata ?? "",
    );
  }

  warn(context: string, message: string, metadata?: Record<string, unknown>): void {
    const entry = this.format("warn", context, message, undefined, metadata);
    console.warn(
      `[${entry.timestamp}] [WARN] [${entry.context}] ${entry.message}`,
      entry.metadata ?? "",
    );
  }

  error(context: string, error: unknown, metadata?: Record<string, unknown>): void {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "An unexpected error occurred.";
    const entry = this.format("error", context, message, error, metadata);
    console.error(
      `[${entry.timestamp}] [ERROR] [${entry.context}] ${entry.message}`,
      entry.error ? { error: entry.error, metadata: entry.metadata } : (entry.metadata ?? ""),
    );
  }

  private format(
    level: "info" | "warn" | "error",
    context: string,
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): LogEntry {
    return {
      level,
      context: sanitizeString(context),
      message: sanitizeString(message),
      error: error ? sanitizeValue(error) : undefined,
      metadata: metadata ? (sanitizeValue(metadata) as Record<string, unknown>) : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}

export const logger = new Logger();
