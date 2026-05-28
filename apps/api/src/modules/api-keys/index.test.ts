import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("../../infrastructure/db/client", () => ({ sql: vi.fn() }));

import { sql } from "../../infrastructure/db/client";
import { hashApiKey, apiKeyPreview, createApiKey, listApiKeys, revokeApiKey, validateApiKey } from "./index";

const mockSql = vi.mocked(sql);

beforeEach(() => mockSql.mockReset());

describe("hashApiKey / apiKeyPreview (pure)", () => {
  it("hashes with SHA-256 (deterministic, matches crypto)", () => {
    const expected = crypto.createHash("sha256").update("oga_abc").digest("hex");
    expect(hashApiKey("oga_abc")).toBe(expected);
    expect(hashApiKey("oga_abc")).toBe(hashApiKey("oga_abc"));
  });

  it("previews first 12 + last 4 chars", () => {
    expect(apiKeyPreview("oga_0123456789abcdefXY")).toBe("oga_01234567...efXY");
  });
});

describe("createApiKey", () => {
  it("mints an oga_ key, stores its hash + preview (never the plaintext)", async () => {
    mockSql.mockResolvedValue([] as never);

    const { id, key, name } = await createApiKey("user_1", "CI key");

    expect(id).toMatch(/^key_/);
    expect(key).toMatch(/^oga_[0-9a-f]{48}$/); // new prefix
    expect(name).toBe("CI key");

    const call = mockSql.mock.calls[0] as unknown[];
    expect(call[1]).toBe(id);                       // id
    expect(call[2]).toBe(hashApiKey(key));          // key_hash, not plaintext
    expect(call[3]).toBe(apiKeyPreview(key));       // key_prefix
    expect(call[4]).toBe("user_1");                 // user_id
    // plaintext key must NOT be among the bound values
    expect(call).not.toContain(key);
  });
});

describe("validateApiKey", () => {
  it("returns the user id + org id + allowlist for a known hash", async () => {
    mockSql
      .mockResolvedValueOnce([{ user_id: "user_42", org_id: "org_user_42", allowed_ip_cidrs: [] }] as never) // SELECT
      .mockResolvedValue([] as never);                          // fire-and-forget UPDATE
    expect(await validateApiKey("oga_whatever")).toEqual({
      userId: "user_42",
      orgId: "org_user_42",
      allowedIpCidrs: [],
    });
  });

  it("returns null when no row matches", async () => {
    mockSql.mockResolvedValue([] as never);
    expect(await validateApiKey("oga_nope")).toBeNull();
  });

  it("still validates a legacy aiq_ key (no prefix gate, pure hash lookup); orgId null if backfill hasn't reached it", async () => {
    // org_id column is nullable during expand-contract — legacy rows
    // pre-backfill (or fresh rows in a future code path that doesn't set it)
    // surface orgId: null. The endpoint can then resolve a fallback org.
    mockSql
      .mockResolvedValueOnce([{ user_id: "legacy_user", org_id: null, allowed_ip_cidrs: [] }] as never)
      .mockResolvedValue([] as never);
    expect(await validateApiKey("aiq_legacy")).toEqual({
      userId: "legacy_user",
      orgId: null,
      allowedIpCidrs: [],
    });
  });

  it("returns blocked when the key has CIDRs and the request IP doesn't match", async () => {
    mockSql
      .mockResolvedValueOnce([{ user_id: "u1", org_id: "org_u1", allowed_ip_cidrs: ["10.0.0.0/8"] }] as never)
      .mockResolvedValue([] as never);
    expect(await validateApiKey("oga_x", "8.8.8.8")).toEqual({
      blocked: "ip_not_allowed",
      userId: "u1",
      orgId: "org_u1",
    });
  });

  it("returns the validated shape when the key has CIDRs and the IP matches", async () => {
    mockSql
      .mockResolvedValueOnce([{ user_id: "u1", org_id: "org_u1", allowed_ip_cidrs: ["10.0.0.0/8"] }] as never)
      .mockResolvedValue([] as never);
    expect(await validateApiKey("oga_x", "10.1.2.3")).toEqual({
      userId: "u1",
      orgId: "org_u1",
      allowedIpCidrs: ["10.0.0.0/8"],
    });
  });

  it("empty allowlist = no restriction (any IP works, even missing)", async () => {
    mockSql
      .mockResolvedValueOnce([{ user_id: "u1", org_id: "org_u1", allowed_ip_cidrs: [] }] as never)
      .mockResolvedValue([] as never);
    expect(await validateApiKey("oga_x", "8.8.8.8")).toEqual({
      userId: "u1",
      orgId: "org_u1",
      allowedIpCidrs: [],
    });
    mockSql
      .mockResolvedValueOnce([{ user_id: "u1", org_id: "org_u1", allowed_ip_cidrs: [] }] as never)
      .mockResolvedValue([] as never);
    expect(await validateApiKey("oga_x")).toEqual({
      userId: "u1",
      orgId: "org_u1",
      allowedIpCidrs: [],
    });
  });
});

describe("listApiKeys / revokeApiKey", () => {
  it("maps the projected preview rows", async () => {
    mockSql.mockResolvedValue([
      { id: "key_1", key_preview: "oga_01234567...efXY", name: "Default", created_at: "2026-01-01", last_used_at: null },
    ] as never);
    const list = await listApiKeys("user_1");
    expect(list).toEqual([
      { id: "key_1", key_preview: "oga_01234567...efXY", name: "Default", created_at: "2026-01-01", last_used_at: null },
    ]);
  });

  it("revoke returns true when a row was updated, false otherwise", async () => {
    mockSql.mockResolvedValueOnce([{ id: "key_1" }] as never);
    expect(await revokeApiKey("user_1", "key_1")).toBe(true);
    mockSql.mockResolvedValueOnce([] as never);
    expect(await revokeApiKey("user_1", "missing")).toBe(false);
  });
});
