import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/infrastructure/email/senders", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("@/modules/auth/crypto", () => ({
  hashPassword: vi.fn(async () => "hashed"),
  generateToken: vi.fn(() => "tok_fixed"),
}));

import { buildApp } from "@/app";
import { rateLimit } from "@/infrastructure/rate-limit";
import { sql } from "@/infrastructure/db/client";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/infrastructure/email/senders";

const app = buildApp();
const mockRate = vi.mocked(rateLimit);
const mockSql = vi.mocked(sql);
const mockVerifyEmail = vi.mocked(sendVerificationEmail);
const mockResetEmail = vi.mocked(sendPasswordResetEmail);

const JSON_HEADERS = { "content-type": "application/json" };
function post(url: string, body: unknown) {
  return app.inject({ method: "POST", url, headers: JSON_HEADERS, payload: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRate.mockResolvedValue({ success: true, remaining: 4, reset: 0 });
  mockSql.mockResolvedValue([] as never);
  // clearAllMocks resets call history but not implementations, so explicitly
  // restore the email senders to resolving (one test below overrides this).
  mockVerifyEmail.mockResolvedValue(undefined as never);
  mockResetEmail.mockResolvedValue(undefined as never);
});

describe("POST /auth/register", () => {
  it("429s when IP rate-limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await post("/auth/register", { email: "a@b.com", password: "longenough" })).statusCode).toBe(429);
  });

  it("400s on missing email / short password", async () => {
    expect((await post("/auth/register", { password: "longenough" })).statusCode).toBe(400);
    expect((await post("/auth/register", { email: "a@b.com", password: "short" })).statusCode).toBe(400);
  });

  it("409s when the email is already taken (credentials)", async () => {
    mockSql.mockResolvedValueOnce([{ id: "u1", provider: "credentials" }] as never);
    const res = await post("/auth/register", { email: "a@b.com", password: "longenough" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("email_taken");
  });

  it("409s with an OAuth hint when the email is a Google account", async () => {
    mockSql.mockResolvedValueOnce([{ id: "u1", provider: "google" }] as never);
    const res = await post("/auth/register", { email: "a@b.com", password: "longenough" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("email_oauth");
  });

  it("creates the user, stores a verification token, and emails it", async () => {
    // SELECT existing -> [], INSERT user -> [], INSERT token -> []
    const res = await post("/auth/register", { email: "New@B.com", password: "longenough" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    const insertedUser = mockSql.mock.calls.some((c) => (c[0] as unknown as string[]).join("?").includes("INSERT INTO users"));
    expect(insertedUser).toBe(true);
    expect(mockVerifyEmail).toHaveBeenCalledWith("new@b.com", "tok_fixed"); // email lowercased
  });

  it("still 200s if the verification email fails (account already created)", async () => {
    mockVerifyEmail.mockRejectedValue(new Error("smtp down"));
    const res = await post("/auth/register", { email: "x@y.com", password: "longenough" });
    expect(res.statusCode).toBe(200);
  });
});

describe("POST /auth/resend-verification", () => {
  it("200s for an unknown email (anti-enumeration), no email sent", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await post("/auth/resend-verification", { email: "ghost@b.com" });
    expect(res.statusCode).toBe(200);
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("200s without sending for an already-verified user", async () => {
    mockSql.mockResolvedValueOnce([{ id: "u1", email_verified: true, provider: "credentials" }] as never);
    await post("/auth/resend-verification", { email: "a@b.com" });
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("429s after 3 sends in the last hour", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "u1", email_verified: false, provider: "credentials" }] as never)
      .mockResolvedValueOnce([{ count: 3 }] as never);
    expect((await post("/auth/resend-verification", { email: "a@b.com" })).statusCode).toBe(429);
  });

  it("sends a fresh verification email for an eligible user", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "u1", email_verified: false, provider: "credentials" }] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValue([] as never);
    const res = await post("/auth/resend-verification", { email: "a@b.com" });
    expect(res.statusCode).toBe(200);
    expect(mockVerifyEmail).toHaveBeenCalledWith("a@b.com", "tok_fixed");
  });
});

describe("POST /auth/forgot-password", () => {
  it("200s for an unknown email without sending (anti-enumeration)", async () => {
    mockSql.mockResolvedValue([] as never);
    await post("/auth/forgot-password", { email: "ghost@b.com" });
    expect(mockResetEmail).not.toHaveBeenCalled();
  });

  it("sends a reset email for a credentials user", async () => {
    mockSql
      .mockResolvedValueOnce([{ id: "u1", email: "a@b.com", provider: "credentials", password_hash: "h" }] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValue([] as never);
    const res = await post("/auth/forgot-password", { email: "a@b.com" });
    expect(res.statusCode).toBe(200);
    expect(mockResetEmail).toHaveBeenCalledWith("a@b.com", "tok_fixed");
  });
});

describe("POST /auth/reset-password", () => {
  it("400s on a missing token or short password", async () => {
    expect((await post("/auth/reset-password", { password: "longenough" })).statusCode).toBe(400);
    expect((await post("/auth/reset-password", { token: "t", password: "short" })).statusCode).toBe(400);
  });

  it("400s on an unknown token", async () => {
    mockSql.mockResolvedValue([] as never);
    expect((await post("/auth/reset-password", { token: "nope", password: "longenough" })).statusCode).toBe(400);
  });

  it("400s on an already-used token", async () => {
    mockSql.mockResolvedValueOnce([
      { user_id: "u1", email: "a@b.com", expires_at: new Date(Date.now() + 3600000).toISOString(), used: true },
    ] as never);
    const res = await post("/auth/reset-password", { token: "t", password: "longenough" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("already been used");
  });

  it("400s on an expired token", async () => {
    mockSql.mockResolvedValueOnce([
      { user_id: "u1", email: "a@b.com", expires_at: new Date(Date.now() - 1000).toISOString(), used: false },
    ] as never);
    const res = await post("/auth/reset-password", { token: "t", password: "longenough" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("expired");
  });

  it("updates the password and consumes the token", async () => {
    mockSql.mockResolvedValueOnce([
      { user_id: "u1", email: "a@b.com", expires_at: new Date(Date.now() + 3600000).toISOString(), used: false },
    ] as never);
    const res = await post("/auth/reset-password", { token: "t", password: "longenough" });
    expect(res.statusCode).toBe(200);
    const updatedPw = mockSql.mock.calls.some((c) => (c[0] as unknown as string[]).join("?").includes("UPDATE users SET password_hash"));
    expect(updatedPw).toBe(true);
  });
});
