import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({
  verifySessionToken: vi.fn(),
}));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { sql } from "@/infrastructure/db/client";

const mockVerify = vi.mocked(verifySessionToken);
const mockSql = vi.mocked(sql);
const app = buildApp();

beforeEach(() => {
  mockVerify.mockReset();
  mockSql.mockReset();
});

/* AR-235 [AR-217-A18] /me/activity tests. The activity module makes
   TWO sql calls per request (SELECT events + COUNT). Each test sets
   them up in order. */

describe("GET /me/activity", () => {
  it("401s when the Authorization header is missing", async () => {
    const res = await app.inject({ method: "GET", url: "/me/activity" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized");
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("401s when the session token is invalid", async () => {
    mockVerify.mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/me/activity",
      headers: { authorization: "Bearer bad-token" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized");
  });

  it("returns the caller's events with defaults (page=1, page_size=20)", async () => {
    mockVerify.mockResolvedValue({ userId: "user_1" });
    mockSql
      .mockResolvedValueOnce([
        {
          id: "evt_1",
          user_id: "user_1",
          event: "api.score.computed",
          metadata: { area: "SW1A 1AA", preset: "research" },
          created_at: "2026-06-09T12:00:00Z",
        },
      ] as never)
      .mockResolvedValueOnce([{ total: 1 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith("good-token");
    expect(mockSql).toHaveBeenCalledTimes(2);
    const body = res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toEqual({
      id: "evt_1",
      user_id: "user_1",
      event: "api.score.computed",
      metadata: { area: "SW1A 1AA", preset: "research" },
      created_at: "2026-06-09T12:00:00Z",
    });
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.page_size).toBe(20);
  });

  it("honours page + page_size query params", async () => {
    mockVerify.mockResolvedValue({ userId: "user_1" });
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 73 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity?page=3&page_size=10",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events).toHaveLength(0);
    expect(body.total).toBe(73);
    expect(body.page).toBe(3);
    expect(body.page_size).toBe(10);
  });

  it("caps page_size at 100", async () => {
    mockVerify.mockResolvedValue({ userId: "user_1" });
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity?page_size=9999",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().page_size).toBe(100);
  });

  it("normalises non-numeric page params to the defaults", async () => {
    mockVerify.mockResolvedValue({ userId: "user_1" });
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity?page=abc&page_size=xyz",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.page).toBe(1);
    expect(body.page_size).toBe(20);
  });

  it("normalises null metadata to an empty object", async () => {
    mockVerify.mockResolvedValue({ userId: "user_1" });
    mockSql
      .mockResolvedValueOnce([
        {
          id: "evt_legacy",
          user_id: "user_1",
          event: "api.report.generated",
          metadata: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ] as never)
      .mockResolvedValueOnce([{ total: 1 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().events[0].metadata).toEqual({});
  });
});
