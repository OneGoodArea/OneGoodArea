import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/server/api-client", () => ({ callApi: vi.fn() }));

import { proxySession } from "@/lib/server/proxy";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";

const mockAuth = vi.mocked(auth as unknown as () => Promise<{ user?: { id?: string } } | null>);
const mockCallApi = vi.mocked(callApi);

/** Minimal NextRequest stand-in with the bits proxySession reads. */
function fakeReq(opts: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): NextRequest {
  const headers = new Map(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method: opts.method ?? "GET",
    headers: { get: (n: string) => headers.get(n.toLowerCase()) ?? null },
    json: async () => opts.body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user_1" } });
  mockCallApi.mockResolvedValue({ status: 200, ok: true, data: { ok: true } });
});

describe("proxySession", () => {
  it("401s without calling apps/api when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await proxySession(fakeReq(), "/usage");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it("forwards a GET with the resolved userId and relays status + body", async () => {
    mockCallApi.mockResolvedValue({ status: 200, ok: true, data: { areas: [] } });
    const res = await proxySession(fakeReq({ method: "GET" }), "/watchlist");
    expect(mockCallApi).toHaveBeenCalledWith("/watchlist", {
      userId: "user_1",
      method: "GET",
      body: undefined,
      headers: {},
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ areas: [] });
  });

  it("forwards the JSON body on writes when forwardBody is set", async () => {
    mockCallApi.mockResolvedValue({ status: 201, ok: true, data: { area: { id: "sa_1" } } });
    const req = fakeReq({ method: "POST", body: { postcode: "M1 1AE" } });
    const res = await proxySession(req, "/watchlist", { forwardBody: true });
    expect(mockCallApi).toHaveBeenCalledWith("/watchlist", {
      userId: "user_1",
      method: "POST",
      body: { postcode: "M1 1AE" },
      headers: {},
    });
    expect(res.status).toBe(201);
  });

  it("passes through whitelisted headers only", async () => {
    const req = fakeReq({
      method: "POST",
      headers: { "idempotency-key": "abc", "x-engine-version": "2.0.0", cookie: "secret" },
      body: {},
    });
    await proxySession(req, "/v1/report", { forwardBody: true, forwardHeaders: ["idempotency-key", "x-engine-version"] });
    const [, opts] = mockCallApi.mock.calls[0];
    expect(opts.headers).toEqual({ "idempotency-key": "abc", "x-engine-version": "2.0.0" });
    expect(opts.headers).not.toHaveProperty("cookie");
  });

  it("relays a non-2xx status + body from apps/api", async () => {
    mockCallApi.mockResolvedValue({ status: 404, ok: false, data: { error: "Not found" } });
    const res = await proxySession(fakeReq({ method: "DELETE" }), "/report/x");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });
});
