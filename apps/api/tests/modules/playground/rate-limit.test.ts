import { describe, it, expect, vi, beforeEach } from "vitest";

const rateLimitMock = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: rateLimitMock }));

import { checkPlaygroundLimits } from "@/modules/playground/rate-limit";
import { newSession } from "@/modules/playground/session";

beforeEach(() => {
  rateLimitMock.mockReset();
  /* Reset any per-test overrides. */
  delete process.env.PLAYGROUND_COOKIE_TOTAL;
  delete process.env.PLAYGROUND_COOKIE_NL;
  delete process.env.PLAYGROUND_IP_DAILY;
  delete process.env.PLAYGROUND_GLOBAL_DAILY;
});

/* Session helper that skips HMAC signing (we're testing the limit
   logic, not the cookie plumbing). */
function session(overrides: Partial<{ tc: number; nc: number }> = {}) {
  const s = newSession({ turnstileVerified: true, nowSeconds: 1_000_000 });
  return { ...s, ...overrides };
}

describe("checkPlaygroundLimits — tier 1 (cookie)", () => {
  it("passes when under all limits", async () => {
    rateLimitMock.mockResolvedValue({ success: true, remaining: 50, reset: 1_000_000 });
    const result = await checkPlaygroundLimits({ session: session(), ip: "1.2.3.4", isNlCall: false });
    expect(result.ok).toBe(true);
  });

  it("caps at the per-cookie total (default 30)", async () => {
    const result = await checkPlaygroundLimits({ session: session({ tc: 30 }), ip: "1.2.3.4", isNlCall: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("cookie_total");
    /* No I/O when tier 1 fails. */
    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it("caps at the per-cookie NL sub-limit (default 3) only for NL calls", async () => {
    rateLimitMock.mockResolvedValue({ success: true, remaining: 50, reset: 1_000_000 });
    const nl = await checkPlaygroundLimits({ session: session({ nc: 3 }), ip: "1.2.3.4", isNlCall: true });
    expect(nl.ok).toBe(false);
    expect(nl.reason).toBe("cookie_nl");
    /* A non-NL call with the same session succeeds. */
    const nonNl = await checkPlaygroundLimits({ session: session({ nc: 3 }), ip: "1.2.3.4", isNlCall: false });
    expect(nonNl.ok).toBe(true);
  });

  it("respects PLAYGROUND_COOKIE_TOTAL env override", async () => {
    process.env.PLAYGROUND_COOKIE_TOTAL = "5";
    const result = await checkPlaygroundLimits({ session: session({ tc: 5 }), ip: "1.2.3.4", isNlCall: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("cookie_total");
  });
});

describe("checkPlaygroundLimits — tier 2 (per-IP)", () => {
  it("fails on per-IP cap and returns Retry-After", async () => {
    /* First call = IP tier. Fail. */
    rateLimitMock.mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() / 1000 + 600 });
    const result = await checkPlaygroundLimits({ session: session(), ip: "1.2.3.4", isNlCall: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("ip_daily");
    expect(result.retry_after).toBeGreaterThan(0);
  });

  it("swallows a transient IP rate-limit DB failure and falls through", async () => {
    rateLimitMock
      .mockRejectedValueOnce(new Error("neon transient"))
      .mockResolvedValueOnce({ success: true, remaining: 50, reset: 1_000_000 });
    const result = await checkPlaygroundLimits({ session: session(), ip: "1.2.3.4", isNlCall: false });
    /* Tier 2 error is non-fatal; tier 3 lets it through. */
    expect(result.ok).toBe(true);
  });

  it("skips tier 2 when ip is null", async () => {
    rateLimitMock.mockResolvedValue({ success: true, remaining: 50, reset: 1_000_000 });
    const result = await checkPlaygroundLimits({ session: session(), ip: null, isNlCall: false });
    expect(result.ok).toBe(true);
    /* Only one call = global tier. */
    expect(rateLimitMock).toHaveBeenCalledTimes(1);
    expect(rateLimitMock.mock.calls[0][0]).toBe("playground:global");
  });
});

describe("checkPlaygroundLimits — tier 3 (global)", () => {
  it("fails on global cap", async () => {
    rateLimitMock
      .mockResolvedValueOnce({ success: true, remaining: 50, reset: 1_000_000 })
      .mockResolvedValueOnce({ success: false, remaining: 0, reset: Date.now() / 1000 + 600 });
    const result = await checkPlaygroundLimits({ session: session(), ip: "1.2.3.4", isNlCall: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("global_daily");
  });

  it("fails CLOSED when the global tier DB errors (cost safety)", async () => {
    rateLimitMock
      .mockResolvedValueOnce({ success: true, remaining: 50, reset: 1_000_000 })
      .mockRejectedValueOnce(new Error("neon down"));
    const result = await checkPlaygroundLimits({ session: session(), ip: "1.2.3.4", isNlCall: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("global_daily");
  });
});
