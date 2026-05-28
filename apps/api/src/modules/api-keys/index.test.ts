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
  it("returns the user id + org id for a known hash", async () => {
    mockSql
      .mockResolvedValueOnce([{ user_id: "user_42", org_id: "org_user_42" }] as never) // SELECT
      .mockResolvedValue([] as never);                          // fire-and-forget UPDATE
    expect(await validateApiKey("oga_whatever")).toEqual({ userId: "user_42", orgId: "org_user_42" });
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
      .mockResolvedValueOnce([{ user_id: "legacy_user", org_id: null }] as never)
      .mockResolvedValue([] as never);
    expect(await validateApiKey("aiq_legacy")).toEqual({ userId: "legacy_user", orgId: null });
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
