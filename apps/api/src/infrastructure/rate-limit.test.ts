import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db/client", () => ({ sql: vi.fn() }));

import { sql } from "./db/client";
import { rateLimit, rateLimitHeaders, type RateLimitResult } from "./rate-limit";

const mockSql = vi.mocked(sql);

beforeEach(() => mockSql.mockReset());

describe("rateLimit", () => {
  it("allows a request under the limit (count + the inserted one)", async () => {
    // Promise.all([SELECT count, INSERT]) — SELECT resolves first
    mockSql.mockResolvedValueOnce([{ count: 5 }] as never).mockResolvedValue([] as never);
    const r = await rateLimit("api:key", { max: 10, windowSeconds: 60 });
    expect(r.success).toBe(true);
    expect(r.remaining).toBe(4); // 10 - (5 + 1)
  });

  it("blocks when the window count exceeds max", async () => {
    mockSql.mockResolvedValueOnce([{ count: 30 }] as never).mockResolvedValue([] as never);
    const r = await rateLimit("api:key", { max: 30, windowSeconds: 60 });
    expect(r.success).toBe(false); // 30 + 1 > 30
    expect(r.remaining).toBe(0);
  });
});

describe("rateLimitHeaders", () => {
  it("emits the standard headers, no Retry-After when allowed", () => {
    const ok: RateLimitResult = { success: true, remaining: 9, reset: 1700000000 };
    const h = rateLimitHeaders(10, ok);
    expect(h["X-RateLimit-Limit"]).toBe("10");
    expect(h["X-RateLimit-Remaining"]).toBe("9");
    expect(h["Retry-After"]).toBeUndefined();
  });

  it("adds Retry-After when the limit is exhausted", () => {
    const reset = Math.ceil(Date.now() / 1000) + 30;
    const blocked: RateLimitResult = { success: false, remaining: 0, reset };
    const h = rateLimitHeaders(10, blocked);
    expect(Number(h["Retry-After"])).toBeGreaterThan(0);
  });
});
