import { describe, expect, it, vi } from "vitest";
import { logger, sanitizeString, sanitizeValue } from "./logger";

describe("sanitized logger", () => {
  it("redacts JWT tokens and bearer strings", () => {
    const rawJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakMe";
    const result = sanitizeString(`Bearer ${rawJwt}`);
    expect(result).not.toContain("doNotLeakMe");
    expect(result).toContain("[REDACTED");
  });

  it("redacts secret params and API keys", () => {
    const url = "https://example.com/api?access_token=secret123&other=safe";
    const result = sanitizeString(url);
    expect(result).not.toContain("secret123");
    expect(result).toContain("other=safe");
  });

  it("masks sensitive keys in nested objects", () => {
    const payload = {
      username: "chef",
      password: "SuperSecretPassword123",
      config: {
        apiKey: "sbp_live_secret_key",
        timeout: 5000,
      },
    };
    const sanitized = sanitizeValue(payload) as typeof payload;
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.config.apiKey).toBe("[REDACTED]");
    expect(sanitized.username).toBe("chef");
    expect(sanitized.config.timeout).toBe(5000);
  });

  it("handles circular references gracefully", () => {
    const obj: Record<string, unknown> = { name: "test" };
    obj.self = obj;
    const sanitized = sanitizeValue(obj) as Record<string, unknown>;
    expect(sanitized.name).toBe("test");
    expect(sanitized.self).toBe("[Circular]");
  });

  it("logs errors safely without throwing", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("Failed auth with token eyJabc.def.ghi");

    logger.error("AuthModule", err, { attemptedToken: "secret_value" });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedCall = consoleSpy.mock.calls[0];
    const logStr = JSON.stringify(loggedCall);
    expect(logStr).not.toContain("secret_value");
    expect(logStr).not.toContain("eyJabc.def.ghi");
    consoleSpy.mockRestore();
  });
});
