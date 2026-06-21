import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/server/api-client", () => ({ callApi: vi.fn() }));

import { GET } from "@/app/api/keys/usage/route";
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

describe("GET /api/keys/usage", () => {
  it("401s without calling apps/api when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(fakeReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it("forwards to /keys/usage with the resolved userId and relays status + body", async () => {
    mockCallApi.mockResolvedValue({
      status: 200,
      ok: true,
      data: {
        totalRequests: 42,
        requestsThisMonth: 5,
        lastRequestAt: "2026-06-12T10:00:00.000Z",
        dailyData: expect.any(Array),
      },
    });
    const res = await GET(fakeReq());
    expect(mockCallApi).toHaveBeenCalledWith("/keys/usage", {
      userId: "user_1",
      method: "GET",
      body: undefined,
      headers: {},
    });
    expect(res.status).toBe(200);
  });

  it("relays a non-2xx status + body from apps/api", async () => {
    mockCallApi.mockResolvedValue({ status: 403, ok: false, data: { error: "Forbidden" } });
    const res = await GET(fakeReq());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("passes through the request method", async () => {
    const res = await GET(fakeReq({ method: "POST" }));
    expect(mockCallApi).toHaveBeenCalledWith("/keys/usage", {
      userId: "user_1",
      method: "POST",
      body: undefined,
      headers: {},
    });
  });
});
