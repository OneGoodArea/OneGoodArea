import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { sql } from "@/infrastructure/db/client";

const app = buildApp();
const mockVerify = vi.mocked(verifySessionToken);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
});

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
    // The cascade ran against the caller's id.
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
