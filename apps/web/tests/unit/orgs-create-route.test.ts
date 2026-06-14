import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/server/api-client", () => ({ callApi: vi.fn() }));

import { POST } from "@/app/api/orgs/route";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";

const mockAuth = vi.mocked(auth as unknown as () => Promise<{ user?: { id?: string } } | null>);
const mockCallApi = vi.mocked(callApi);

/** Minimal NextRequest stand-in with the bits proxySession reads. */
function fakeReq(opts: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): NextRequest {
  const headers = new Map(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    method: opts.method ?? "POST",
    headers: { get: (n: string) => headers.get(n.toLowerCase()) ?? null },
    json: async () => opts.body,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user_1" } });
  mockCallApi.mockResolvedValue({ status: 200, ok: true, data: { ok: true } });
});

describe("POST /api/orgs", () => {
  it("401s without calling apps/api when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(fakeReq({ body: { name: "Acme" } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it("forwards to /v1/orgs with the body and relays status + body", async () => {
    mockCallApi.mockResolvedValue({
      status: 201,
      ok: true,
      data: { org: { id: "org_x", name: "Acme Inc" }, caller_role: "owner" },
    });
    const res = await POST(fakeReq({ body: { name: "Acme Inc" } }));
    expect(mockCallApi).toHaveBeenCalledWith("/v1/orgs", {
      userId: "user_1",
      method: "POST",
      body: { name: "Acme Inc" },
      headers: {},
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.org.id).toBe("org_x");
    expect(body.caller_role).toBe("owner");
  });

  it("relays a non-2xx status + body from apps/api", async () => {
    mockCallApi.mockResolvedValue({ status: 400, ok: false, data: { error: "Name is required" } });
    const res = await POST(fakeReq({ body: {} }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Name is required" });
  });

  it("relays a 409 conflict with slug_taken code", async () => {
    mockCallApi.mockResolvedValue({ status: 409, ok: false, data: { error: "Slug already taken", code: "slug_taken" } });
    const res = await POST(fakeReq({ body: { name: "Taken", slug: "taken" } }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("slug_taken");
  });
});
