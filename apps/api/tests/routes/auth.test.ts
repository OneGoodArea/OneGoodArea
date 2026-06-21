import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/infrastructure/email/senders", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("@/modules/auth/crypto", () => ({
  hashPassword: vi.fn(async () => "hashed"),
  verifyPassword: vi.fn(),
  generateToken: vi.fn(() => "tok_fixed"),
}));
vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  canGenerateReport: vi.fn(),
  getUserPlan: vi.fn(),
  hasApiAccess: vi.fn(),
}));
vi.mock("@/modules/billing/stripe-client", () => ({
  stripe: { subscriptions: { retrieve: vi.fn() } },
}));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { rateLimit } from "@/infrastructure/rate-limit";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/infrastructure/email/senders";
import { verifySessionToken } from "@/modules/auth/session-token";
import { verifyPassword } from "@/modules/auth/crypto";
import { canGenerateReport, getUserPlan, hasApiAccess } from "@/modules/usage";
import { stripe } from "@/modules/billing/stripe-client";
import { sql } from "@/infrastructure/db/client";

const app = await buildApp();

const mockRate = vi.mocked(rateLimit);
const mockVerifyEmail = vi.mocked(sendVerificationEmail);
const mockResetEmail = vi.mocked(sendPasswordResetEmail);
const mockSessionVerify = vi.mocked(verifySessionToken);
const mockVerifyPw = vi.mocked(verifyPassword);
const mockQuota = vi.mocked(canGenerateReport);
const mockGetPlan = vi.mocked(getUserPlan);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockSubRetrieve = vi.mocked(stripe.subscriptions.retrieve);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt" };
const JSON_HEADERS = { "content-type": "application/json" };
function postJson(url: string, body: unknown, headers: Record<string, string> = { ...JSON_HEADERS, authorization: "Bearer session.jwt" }) {
  return app.inject({ method: "POST", url, headers, payload: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  // --- auth-credentials mocks ---
  mockRate.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
  mockSql.mockResolvedValue([] as never);
  mockVerifyEmail.mockResolvedValue(undefined as never);
  mockResetEmail.mockResolvedValue(undefined as never);
  // --- session-token mocks ---
  mockSessionVerify.mockResolvedValue({ userId: "user_1" });
  // --- settings-password mocks ---
  mockVerifyPw.mockResolvedValue({ valid: true, needsRehash: false });
});

// ── auth-credentials.test.ts ────────────────────────────────────────

describe("POST /auth/register", () => {
  it("429s when IP rate-limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await postJson("/auth/register", { email: "a@b.com", password: "longenough" })).statusCode).toBe(429);
  });

  it("400s on missing email / short password", async () => {
    expect((await postJson("/auth/register", { password: "longenough" })).statusCode).toBe(400);
    expect((await postJson("/auth/register", { email: "a@b.com", password: "short" })).statusCode).toBe(400);
  });

  it("409s when the email is already taken (credentials)", async () => {
    mockSql.mockResolvedValueOnce([{ id: "u1", provider: "credentials" }] as never);
    const res = await postJson("/auth/register", { email: "a@b.com", password: "longenough" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("email_taken");
  });

  it("409s with an OAuth hint when the email is a Google account", async () => {
    mockSql.mockResolvedValueOnce([{ id: "u1", provider: "google" }] as never);
    const res = await postJson("/auth/register", { email: "a@b.com", password: "longenough" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("email_oauth");
  });

  it("creates the user, stores a verification token, and emails it", async () => {
    const res = await postJson("/auth/register", { email: "New@B.com", password: "longenough" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    const insertedUser = mockSql.mock.calls.some((c) => (c[0] as unknown as string[]).join("?").includes("INSERT INTO users"));
    expect(insertedUser).toBe(true);
    expect(mockVerifyEmail).toHaveBeenCalledWith("new@b.com", "tok_fixed");
  });

  it("still 200s if the verification email fails (account already created)", async () => {
    mockVerifyEmail.mockRejectedValue(new Error("smtp down"));
    const res = await postJson("/auth/register", { email: "x@y.com", password: "longenough" });
    expect(res.statusCode).toBe(200);
  });
});

describe("POST /auth/resend-verification", () => {
  it("200s for an unknown email (anti-enumeration), no email sent", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await postJson("/auth/resend-verification", { email: "ghost@b.com" });
    expect(res.statusCode).toBe(200);
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("200s without sending for an already-verified user", async () => {
    mockSql.mockResolvedValueOnce([{ id: "u1", email_verified: true, provider: "credentials" }] as never);
    await postJson("/auth/resend-verification", { email: "a@b.com" });
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("429s after 3 sends in the last hour", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "u1", email_verified: false, provider: "credentials" }] as never)
      .mockResolvedValueOnce([{ count: 3 }] as never);
    expect((await postJson("/auth/resend-verification", { email: "a@b.com" })).statusCode).toBe(429);
  });

  it("sends a fresh verification email for an eligible user", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "u1", email_verified: false, provider: "credentials" }] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValue([] as never);
    const res = await postJson("/auth/resend-verification", { email: "a@b.com" });
    expect(res.statusCode).toBe(200);
    expect(mockVerifyEmail).toHaveBeenCalledWith("a@b.com", "tok_fixed");
  });
});

describe("POST /auth/forgot-password", () => {
  it("200s for an unknown email without sending (anti-enumeration)", async () => {
    mockSql.mockResolvedValue([] as never);
    await postJson("/auth/forgot-password", { email: "ghost@b.com" });
    expect(mockResetEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email for a credentials user", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "u1", email: "a@b.com", provider: "credentials", password_hash: "h" }] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValue([] as never);
    const res = await postJson("/auth/forgot-password", { email: "a@b.com" });
    expect(res.statusCode).toBe(200);
    expect(mockResetEmail).toHaveBeenCalledWith("a@b.com", "tok_fixed");
  });
});

describe("POST /auth/reset-password", () => {
  it("400s on a missing token or short password", async () => {
    expect((await postJson("/auth/reset-password", { password: "longenough" })).statusCode).toBe(400);
    expect((await postJson("/auth/reset-password", { token: "t", password: "short" })).statusCode).toBe(400);
  });

  it("400s on an unknown token", async () => {
    mockSql.mockResolvedValue([] as never);
    expect((await postJson("/auth/reset-password", { token: "nope", password: "longenough" })).statusCode).toBe(400);
  });

  it("400s on an already-used token", async () => {
    mockSql.mockResolvedValueOnce([
      { user_id: "u1", email: "a@b.com", expires_at: new Date(Date.now() + 3600000).toISOString(), used: true },
    ] as never);
    const res = await postJson("/auth/reset-password", { token: "t", password: "longenough" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("already been used");
  });

  it("400s on an expired token", async () => {
    mockSql.mockResolvedValueOnce([
      { user_id: "u1", email: "a@b.com", expires_at: new Date(Date.now() - 1000).toISOString(), used: false },
    ] as never);
    const res = await postJson("/auth/reset-password", { token: "t", password: "longenough" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("expired");
  });

  it("updates the password and consumes the token", async () => {
    mockSql.mockResolvedValueOnce([
      { user_id: "u1", email: "a@b.com", expires_at: new Date(Date.now() + 3600000).toISOString(), used: false },
    ] as never);
    const res = await postJson("/auth/reset-password", { token: "t", password: "longenough" });
    expect(res.statusCode).toBe(200);
    const updatedPw = mockSql.mock.calls.some((c) => (c[0] as unknown as string[]).join("?").includes("UPDATE users SET password_hash"));
    expect(updatedPw).toBe(true);
  });
});

// ── delete-account.test.ts ──────────────────────────────────────────

describe("DELETE /settings/delete-account", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/settings/delete-account" });
    expect(res.statusCode).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("deletes the account and returns success", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "DELETE", url: "/settings/delete-account", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    const joined = (mockSql.mock.calls[0][0] as unknown as string[]).join("?");
    expect(joined).toContain("DELETE FROM users WHERE id =");
  });

  it("500s when the deletion fails", async () => {
    mockSql.mockRejectedValue(new Error("db down"));
    const res = await app.inject({ method: "DELETE", url: "/settings/delete-account", headers: AUTH });
    expect(res.statusCode).toBe(500);
    expect(res.json().error).toBe("Failed to delete account");
  });
});

// ── settings-password.test.ts ───────────────────────────────────────

describe("POST /settings/password", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/settings/password", headers: JSON_HEADERS, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s when a field is missing or the new password is short", async () => {
    expect((await postJson("/settings/password", { currentPassword: "x" })).statusCode).toBe(400);
    expect((await postJson("/settings/password", { currentPassword: "x", newPassword: "short" })).statusCode).toBe(400);
  });

  it("404s when the user does not exist", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await postJson("/settings/password", { currentPassword: "old", newPassword: "longenough" });
    expect(res.statusCode).toBe(404);
  });

  it("400s for an OAuth-only account (no password to change)", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: null, provider: "google" }] as never);
    const res = await postJson("/settings/password", { currentPassword: "old", newPassword: "longenough" });
    expect(res.statusCode).toBe(400);
  });

  it("403s when the current password is wrong", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: "h", provider: "credentials" }] as never);
    mockVerifyPw.mockResolvedValue({ valid: false, needsRehash: false });
    const res = await postJson("/settings/password", { currentPassword: "wrong", newPassword: "longenough" });
    expect(res.statusCode).toBe(403);
  });

  it("updates the password when the current one verifies", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: "h", provider: "credentials" }] as never);
    const res = await postJson("/settings/password", { currentPassword: "old", newPassword: "longenough" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    const updated = mockSql.mock.calls.some((c) => (c[0] as unknown as string[]).join("?").includes("UPDATE users SET password_hash"));
    expect(updated).toBe(true);
  });
});

// ── session-reads.test.ts ───────────────────────────────────────────

describe("GET /usage", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/usage" })).statusCode).toBe(401);
  });

  it("returns the caller's quota usage", async () => {
    mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 3, limit: 35 } as never);
    const res = await app.inject({ method: "GET", url: "/usage", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ allowed: true, used: 3, limit: 35 });
  });
});

describe("GET /settings/subscription", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/settings/subscription" })).statusCode).toBe(401);
  });

  it("reports plan with no Stripe subscription", async () => {
    mockGetPlan.mockResolvedValue("sandbox");
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "GET", url: "/settings/subscription", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plan).toBe("sandbox");
    expect(body.planName).toBe("Sandbox");
    expect(body.hasStripeSubscription).toBe(false);
    expect(body.cancelAt).toBeNull();
    expect(mockSubRetrieve).not.toHaveBeenCalled();
  });

  it("surfaces a scheduled cancellation date from Stripe", async () => {
    mockGetPlan.mockResolvedValue("build");
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_1" }] as never);
    mockSubRetrieve.mockResolvedValue({ cancel_at_period_end: true, current_period_end: 1735689600 } as never);
    const res = await app.inject({ method: "GET", url: "/settings/subscription", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.hasStripeSubscription).toBe(true);
    expect(body.cancelAt).toBe(new Date(1735689600 * 1000).toISOString());
  });

  it("treats a missing Stripe subscription as no cancellation (swallows the error)", async () => {
    mockGetPlan.mockResolvedValue("build");
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_gone" }] as never);
    mockSubRetrieve.mockRejectedValue(new Error("No such subscription"));
    const res = await app.inject({ method: "GET", url: "/settings/subscription", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().cancelAt).toBeNull();
  });
});

describe("GET /keys/usage", () => {
  beforeEach(() => {
    mockApiAccess.mockResolvedValue(true);
    mockGetPlan.mockResolvedValue("build");
  });

  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/keys/usage" })).statusCode).toBe(401);
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await app.inject({ method: "GET", url: "/keys/usage", headers: AUTH });
    expect(res.statusCode).toBe(403);
  });

  it("aggregates totals, a full 30-day series, and active keys", async () => {
    mockSql
      .mockResolvedValueOnce([{ count: 42 }] as never)
      .mockResolvedValueOnce([{ count: 7 }] as never)
      .mockResolvedValueOnce([{ day: new Date().toISOString(), count: 5 }] as never)
      .mockResolvedValueOnce([{ created_at: "2026-05-20T00:00:00.000Z" }] as never)
      .mockResolvedValueOnce([
        { id: "key_1", key_preview: "oga_abcd", name: "Default", created_at: "2026-01-01", last_used_at: null },
      ] as never);

    const res = await app.inject({ method: "GET", url: "/keys/usage", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalRequests).toBe(42);
    expect(body.requestsThisMonth).toBe(7);
    expect(body.monthlyLimit).toBe(6000);
    expect(body.dailyData).toHaveLength(30);
    expect(body.keys).toEqual([
      { id: "key_1", key_preview: "oga_abcd", name: "Default", created_at: "2026-01-01", last_used_at: null },
    ]);
  });

  describe("?org=<id> filter (AR-289)", () => {
    it("403s when the caller is not a member of the requested org", async () => {
      vi.mocked(sql).mockResolvedValueOnce([] as never);
      const res = await app.inject({
        method: "GET",
        url: "/keys/usage?org=org_someone_else",
        headers: AUTH,
      });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ error: expect.stringMatching(/member/i) });
    });

    it("200s and runs the filtered queries when the caller IS a member", async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([{ "?column?": 1 }] as never)
        .mockResolvedValueOnce([{ count: 12 }] as never)
        .mockResolvedValueOnce([{ count: 4 }] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const res = await app.inject({
        method: "GET",
        url: "/keys/usage?org=org_mine",
        headers: AUTH,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ totalRequests: 12, requestsThisMonth: 4 });
    });

    it("no ?org param → no membership check, original 5-query path", async () => {
      vi.mocked(sql)
        .mockResolvedValueOnce([{ count: 99 }] as never)
        .mockResolvedValueOnce([{ count: 11 }] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([] as never);

      const res = await app.inject({ method: "GET", url: "/keys/usage", headers: AUTH });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ totalRequests: 99, requestsThisMonth: 11 });
    });
  });
});
