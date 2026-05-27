import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { verifySessionToken } from "./modules/auth/session-token";
import { sql } from "./infrastructure/db/client";

const app = buildApp();
const mockVerify = vi.mocked(verifySessionToken);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
  mockSql.mockResolvedValue([] as never);
});

describe("GET /watchlist", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/watchlist" })).statusCode).toBe(401);
  });

  it("returns the caller's saved areas", async () => {
    mockSql.mockResolvedValue([
      { id: "sa_1", postcode: "M1 1AE", label: "Home", intent: "moving", created_at: "2026-05-25" },
    ] as never);
    const res = await app.inject({ method: "GET", url: "/watchlist", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().areas).toHaveLength(1);
    expect(res.json().areas[0].postcode).toBe("M1 1AE");
  });
});

describe("POST /watchlist", () => {
  function post(body: unknown) {
    return app.inject({ method: "POST", url: "/watchlist", headers: AUTH, payload: JSON.stringify(body) });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/watchlist", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s when postcode is missing", async () => {
    const res = await post({ label: "Home" });
    expect(res.statusCode).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("normalises the postcode and saves (201)", async () => {
    mockSql.mockResolvedValue([
      { id: "sa_1", postcode: "M1 1AE", label: "Home", intent: "moving", created_at: "x" },
    ] as never);
    const res = await post({ postcode: " m1 1ae ", label: " Home ", intent: "moving" });
    expect(res.statusCode).toBe(201);
    expect(res.json().area.id).toBe("sa_1");
    // Inserted with the uppercased/trimmed postcode + trimmed label.
    const params = mockSql.mock.calls[0].slice(1);
    expect(params[1]).toBe("M1 1AE"); // postcode
    expect(params[2]).toBe("Home"); // label
  });

  it("409s when the area is already saved (ON CONFLICT DO NOTHING -> no row)", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await post({ postcode: "M1 1AE" });
    expect(res.statusCode).toBe(409);
  });
});

describe("DELETE /watchlist/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "DELETE", url: "/watchlist/sa_1" })).statusCode).toBe(401);
  });

  it("404s when the area is not the caller's", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "DELETE", url: "/watchlist/sa_x", headers: AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("removes the caller's saved area", async () => {
    mockSql.mockResolvedValue([{ id: "sa_1" }] as never);
    const res = await app.inject({ method: "DELETE", url: "/watchlist/sa_1", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
