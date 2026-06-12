import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));

import { GET, PATCH } from "@/app/api/me/org/route";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

const mockAuth = vi.mocked(auth as unknown as () => Promise<{ user?: { id?: string } } | null>);
const mockSql = vi.mocked(sql as unknown as (...args: unknown[]) => Promise<unknown[]>);

/* Minimal NextRequest shim — the BFF reads only .json() on PATCH. */
function fakeReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const ORG_ROW = {
  id: "org_1",
  slug: "acme",
  name: "Acme Inc",
  display_name: null,
  brand_url: null,
  logo_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const OWNER_MEMBERSHIP = [{ org_id: "org_1", role: "owner" as const }];
const MEMBER_MEMBERSHIP = [{ org_id: "org_1", role: "member" as const }];

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user_1" } });
});

describe("GET /api/me/org", () => {
  it("401s without a session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("returns {org: null} when the user has no memberships", async () => {
    mockSql.mockResolvedValueOnce([]); // resolveOrgContext
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ org: null, caller_role: null });
  });

  it("returns the org + caller_role for a member", async () => {
    mockSql
      .mockResolvedValueOnce(OWNER_MEMBERSHIP) // resolveOrgContext
      .mockResolvedValueOnce([ORG_ROW]);        // fetchOrg
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ org: ORG_ROW, caller_role: "owner" });
  });

  it("returns {org: null} when the org row is missing (invariant breach, handle cleanly)", async () => {
    mockSql
      .mockResolvedValueOnce(OWNER_MEMBERSHIP)
      .mockResolvedValueOnce([]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ org: null, caller_role: null });
  });
});

describe("PATCH /api/me/org", () => {
  it("401s without a session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(fakeReq({ name: "New name" }));
    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on an empty patch (must change at least one field)", async () => {
    const res = await PATCH(fakeReq({}));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on a malformed slug", async () => {
    const res = await PATCH(fakeReq({ slug: "Bad Slug!" }));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on a malformed logo_url", async () => {
    const res = await PATCH(fakeReq({ logo_url: "not a url at all" }));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("403s when the caller is a member (admin or owner required)", async () => {
    mockSql.mockResolvedValueOnce(MEMBER_MEMBERSHIP);
    const res = await PATCH(fakeReq({ name: "New name" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("admin_required");
  });

  it("404s when the user has no membership", async () => {
    mockSql.mockResolvedValueOnce([]); // resolveOrgContext
    const res = await PATCH(fakeReq({ name: "New name" }));
    expect(res.status).toBe(404);
  });

  it("200s on the happy path and returns the updated org", async () => {
    const updated = { ...ORG_ROW, name: "Acme Co", updated_at: "2026-06-12T00:00:00.000Z" };
    mockSql
      .mockResolvedValueOnce(OWNER_MEMBERSHIP) // resolveOrgContext
      .mockResolvedValueOnce([ORG_ROW])         // fetchOrg (current)
      .mockResolvedValueOnce([updated]);        // UPDATE RETURNING

    const res = await PATCH(fakeReq({ name: "Acme Co" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.name).toBe("Acme Co");
    expect(body.caller_role).toBe("owner");
  });

  it("relays a unique-slug conflict as 409 with code slug_in_use", async () => {
    mockSql
      .mockResolvedValueOnce(OWNER_MEMBERSHIP)
      .mockResolvedValueOnce([ORG_ROW])
      .mockRejectedValueOnce(new Error("duplicate key value violates unique constraint orgs_slug_idx"));
    const res = await PATCH(fakeReq({ slug: "taken" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("slug_in_use");
  });

  it("preserves untouched fields on a partial patch (read-modify-write)", async () => {
    const current = { ...ORG_ROW, display_name: "Acme Public", brand_url: "https://acme.example", logo_url: "https://cdn.acme.example/logo.png" };
    const updated = { ...current, name: "Acme Group" };
    mockSql
      .mockResolvedValueOnce(OWNER_MEMBERSHIP)
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([updated]);

    const res = await PATCH(fakeReq({ name: "Acme Group" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.display_name).toBe("Acme Public");
    expect(body.org.brand_url).toBe("https://acme.example");
    expect(body.org.logo_url).toBe("https://cdn.acme.example/logo.png");
  });

  it("clears a nullable field when patch carries explicit null", async () => {
    const current = { ...ORG_ROW, logo_url: "https://cdn.acme.example/logo.png" };
    const updated = { ...current, logo_url: null };
    mockSql
      .mockResolvedValueOnce(OWNER_MEMBERSHIP)
      .mockResolvedValueOnce([current])
      .mockResolvedValueOnce([updated]);

    const res = await PATCH(fakeReq({ logo_url: null }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.org.logo_url).toBeNull();
  });
});
