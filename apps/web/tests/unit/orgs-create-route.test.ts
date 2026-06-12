import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));

import { POST } from "@/app/api/orgs/route";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

const mockAuth = vi.mocked(auth as unknown as () => Promise<{ user?: { id?: string } } | null>);
const mockSql = vi.mocked(sql as unknown as (...args: unknown[]) => Promise<unknown[]>);

function fakeReq(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

const NEW_ORG = {
  id: "org_x",
  slug: "acme",
  name: "Acme Inc",
  display_name: null,
  brand_url: null,
  logo_url: null,
  created_at: "2026-06-12T00:00:00.000Z",
  updated_at: "2026-06-12T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user_1" } });
});

describe("POST /api/orgs", () => {
  it("401s without a session and never touches the DB", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(fakeReq({ name: "Acme" }));
    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on missing name", async () => {
    const res = await POST(fakeReq({}));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on a malformed slug", async () => {
    const res = await POST(fakeReq({ name: "Acme", slug: "Acme Inc!" }));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on a too-long name (>200 chars)", async () => {
    const res = await POST(fakeReq({ name: "x".repeat(201) }));
    expect(res.status).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("201s on the happy path, INSERTs the org + owner membership, returns caller_role owner", async () => {
    mockSql
      .mockResolvedValueOnce([NEW_ORG]) // INSERT INTO orgs RETURNING
      .mockResolvedValueOnce([]);        // INSERT INTO org_members (no RETURNING)
    const res = await POST(fakeReq({ name: "Acme Inc" }));
    expect(res.status).toBe(201);
    expect(mockSql).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.org.id).toBe(NEW_ORG.id);
    expect(body.caller_role).toBe("owner");
  });

  it("respects an explicit slug instead of deriving from name", async () => {
    /* The SQL helper is tagged-template; the slug appears as one of
       the interpolated values. We just check the first INSERT call
       receives a value matching the explicit slug somewhere in its
       arguments. */
    const customSlug = "acme-uk";
    const inserted = { ...NEW_ORG, slug: customSlug };
    mockSql
      .mockResolvedValueOnce([inserted])
      .mockResolvedValueOnce([]);
    const res = await POST(fakeReq({ name: "Acme Inc", slug: customSlug }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.org.slug).toBe(customSlug);
    /* First INSERT should carry the custom slug as an interpolated value. */
    const firstCallArgs = mockSql.mock.calls[0] as unknown[];
    expect(firstCallArgs).toContain(customSlug);
  });

  it("relays a unique-slug 23505 violation as 409 with code slug_taken", async () => {
    const pgErr = Object.assign(new Error("duplicate key value violates unique constraint orgs_slug_idx"), { code: "23505" });
    mockSql.mockRejectedValueOnce(pgErr);
    const res = await POST(fakeReq({ name: "Taken", slug: "taken" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("slug_taken");
  });

  it("relays a regex-matched unique constraint message as 409 even without pg code", async () => {
    /* Defence-in-depth for drivers that don't surface the numeric pg code. */
    mockSql.mockRejectedValueOnce(new Error("duplicate key in unique constraint orgs_slug_unique"));
    const res = await POST(fakeReq({ name: "Taken" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("slug_taken");
  });
});
