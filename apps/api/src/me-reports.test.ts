import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { validateApiKey } from "./modules/api-keys";
import { sql } from "./infrastructure/db/client";

const mockValidate = vi.mocked(validateApiKey);
const mockSql = vi.mocked(sql);
const app = buildApp();

beforeEach(() => {
  mockValidate.mockReset();
  mockSql.mockReset();
});

describe("GET /me/reports", () => {
  it("401s when the Authorization header is missing", async () => {
    const res = await app.inject({ method: "GET", url: "/me/reports" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/Missing API key/);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s when the API key is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/me/reports",
      headers: { authorization: "Bearer oga_bad" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/Invalid or revoked/);
  });

  it("returns the caller's reports for a valid key", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
    mockSql.mockResolvedValue([
      { id: "rpt_1", area: "Manchester", intent: "research", score: 72, created_at: "2026-01-02" },
      { id: "rpt_2", area: "Leeds", intent: "investing", score: 64, created_at: "2026-01-01" },
    ] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/reports",
      headers: { authorization: "Bearer oga_good" },
    });

    expect(res.statusCode).toBe(200);
    expect(mockValidate).toHaveBeenCalledWith("oga_good");
    expect(mockSql).toHaveBeenCalledOnce();
    const body = res.json();
    expect(body.reports).toHaveLength(2);
    expect(body.reports[0]).toEqual({
      id: "rpt_1",
      area: "Manchester",
      intent: "research",
      score: 72,
      created_at: "2026-01-02",
    });
  });
});
