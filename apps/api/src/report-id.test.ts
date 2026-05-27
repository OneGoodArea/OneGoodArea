import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { verifySessionToken } from "./modules/auth/session-token";
import { sql } from "./infrastructure/db/client";

const app = buildApp();
const mockVerify = vi.mocked(verifySessionToken);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
});

describe("GET /report/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/report/rpt_1" })).statusCode).toBe(401);
  });

  it("404s when the report is not the caller's / missing", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "GET", url: "/report/rpt_x", headers: AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("returns the report, parsing a stringified report column", async () => {
    mockSql.mockResolvedValue([
      {
        id: "rpt_1",
        area: "Manchester",
        intent: "research",
        report: JSON.stringify({ areaiq_score: 72 }),
        score: 72,
        created_at: "2026-05-24T00:00:00.000Z",
      },
    ] as never);
    const res = await app.inject({ method: "GET", url: "/report/rpt_1", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe("rpt_1");
    expect(body.report).toEqual({ areaiq_score: 72 }); // parsed from string
    expect(body.score).toBe(72);
  });

  it("passes through an already-object report column", async () => {
    mockSql.mockResolvedValue([
      { id: "rpt_2", area: "Leeds", intent: "moving", report: { areaiq_score: 60 }, score: 60, created_at: "x" },
    ] as never);
    const body = (await app.inject({ method: "GET", url: "/report/rpt_2", headers: AUTH })).json();
    expect(body.report).toEqual({ areaiq_score: 60 });
  });
});

describe("DELETE /report/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "DELETE", url: "/report/rpt_1" })).statusCode).toBe(401);
  });

  it("404s when nothing was deleted", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "DELETE", url: "/report/rpt_x", headers: AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("returns ok when the report is deleted", async () => {
    mockSql.mockResolvedValue([{ id: "rpt_1" }] as never);
    const res = await app.inject({ method: "DELETE", url: "/report/rpt_1", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
