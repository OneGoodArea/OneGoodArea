import { describe, it, expect } from "vitest";
import { rateLimitHeaders, type RateLimitResult } from "../lib/rate-limit";

describe("rateLimitHeaders", () => {
  it("emits the standard X-RateLimit-* headers on success", () => {
    const result: RateLimitResult = {
      success: true,
      remaining: 29,
      reset: Math.ceil(Date.now() / 1000) + 60,
    };
    const headers = rateLimitHeaders(30, result);

    expect(headers["X-RateLimit-Limit"]).toBe("30");
    expect(headers["X-RateLimit-Remaining"]).toBe("29");
    expect(headers["X-RateLimit-Reset"]).toBe(String(result.reset));
  });

  it("does NOT emit Retry-After when the limit has not been hit", () => {
    const result: RateLimitResult = {
      success: true,
      remaining: 5,
      reset: Math.ceil(Date.now() / 1000) + 60,
    };
    const headers = rateLimitHeaders(30, result);
    expect(headers["Retry-After"]).toBeUndefined();
  });

  it("emits Retry-After (delay-seconds) when the limit is exhausted", () => {
    const nowSeconds = Math.ceil(Date.now() / 1000);
    const reset = nowSeconds + 42; // ~42 seconds until window resets
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      reset,
    };
    const headers = rateLimitHeaders(30, result);

    expect(headers["Retry-After"]).toBeDefined();
    const retryAfter = Number(headers["Retry-After"]);
    // Allow a small tolerance for the elapsed clock between setup and call
    expect(retryAfter).toBeGreaterThanOrEqual(40);
    expect(retryAfter).toBeLessThanOrEqual(43);
  });

  it("clamps Retry-After to 0 when the reset is already in the past", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      reset: Math.floor(Date.now() / 1000) - 10,
    };
    const headers = rateLimitHeaders(30, result);
    expect(headers["Retry-After"]).toBe("0");
  });

  it("Retry-After is an integer string (delay-seconds per RFC 7231)", () => {
    const result: RateLimitResult = {
      success: false,
      remaining: 0,
      reset: Math.ceil(Date.now() / 1000) + 17,
    };
    const headers = rateLimitHeaders(30, result);
    expect(headers["Retry-After"]).toMatch(/^\d+$/);
  });
});
