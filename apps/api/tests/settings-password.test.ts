import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/auth/crypto", () => ({
  hashPassword: vi.fn(async () => "new-hash"),
  verifyPassword: vi.fn(),
  generateToken: vi.fn(() => "tok"),
}));

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { sql } from "@/infrastructure/db/client";
import { verifyPassword } from "@/modules/auth/crypto";

const app = buildApp();
const mockVerify = vi.mocked(verifySessionToken);
const mockSql = vi.mocked(sql);
const mockVerifyPw = vi.mocked(verifyPassword);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };
function post(body: unknown, headers: Record<string, string> = AUTH) {
  return app.inject({ method: "POST", url: "/settings/password", headers, payload: JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
  mockSql.mockResolvedValue([] as never);
  mockVerifyPw.mockResolvedValue({ valid: true, needsRehash: false });
});

describe("POST /settings/password", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/settings/password", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s when a field is missing or the new password is short", async () => {
    expect((await post({ currentPassword: "x" })).statusCode).toBe(400);
    expect((await post({ currentPassword: "x", newPassword: "short" })).statusCode).toBe(400);
  });

  it("404s when the user does not exist", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await post({ currentPassword: "old", newPassword: "longenough" });
    expect(res.statusCode).toBe(404);
  });

  it("400s for an OAuth-only account (no password to change)", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: null, provider: "google" }] as never);
    const res = await post({ currentPassword: "old", newPassword: "longenough" });
    expect(res.statusCode).toBe(400);
  });

  it("403s when the current password is wrong", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: "h", provider: "credentials" }] as never);
    mockVerifyPw.mockResolvedValue({ valid: false, needsRehash: false });
    const res = await post({ currentPassword: "wrong", newPassword: "longenough" });
    expect(res.statusCode).toBe(403);
  });

  it("updates the password when the current one verifies", async () => {
    mockSql.mockResolvedValueOnce([{ password_hash: "h", provider: "credentials" }] as never);
    const res = await post({ currentPassword: "old", newPassword: "longenough" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    const updated = mockSql.mock.calls.some((c) => (c[0] as unknown as string[]).join("?").includes("UPDATE users SET password_hash"));
    expect(updated).toBe(true);
  });
});
