import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./db/client", () => ({ sql: vi.fn() }));

import { sql } from "./db/client";
import { hashRequest, parseIdempotencyKey, withIdempotency } from "./idempotency";

const mockSql = vi.mocked(sql);

beforeEach(() => mockSql.mockReset());

describe("hashRequest", () => {
  it("is deterministic and differs by payload", () => {
    expect(hashRequest({ a: 1 })).toBe(hashRequest({ a: 1 }));
    expect(hashRequest({ a: 1 })).not.toBe(hashRequest({ a: 2 }));
  });
});

describe("parseIdempotencyKey", () => {
  it("returns null for absent/empty, trims otherwise", () => {
    expect(parseIdempotencyKey(null)).toBeNull();
    expect(parseIdempotencyKey("   ")).toBeNull();
    expect(parseIdempotencyKey("  abc  ")).toBe("abc");
  });

  it("throws on an over-long key", () => {
    expect(() => parseIdempotencyKey("x".repeat(256))).toThrow(/length/);
  });
});

describe("withIdempotency", () => {
  it("runs the handler directly when no key is supplied", async () => {
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { ok: true } });
    const res = await withIdempotency("u1", null, { area: "M1" }, handler);
    expect(handler).toHaveBeenCalledOnce();
    expect(res).toEqual({ status: 200, body: { ok: true }, replayed: false });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("runs + stores on a cache miss", async () => {
    mockSql.mockResolvedValueOnce([] as never).mockResolvedValue([] as never); // SELECT miss, INSERT
    const handler = vi.fn().mockResolvedValue({ status: 200, body: { id: "rpt_1" } });
    const res = await withIdempotency("u1", "key-1", { area: "M1" }, handler);
    expect(handler).toHaveBeenCalledOnce();
    expect(res.replayed).toBe(false);
    expect(mockSql).toHaveBeenCalledTimes(2); // SELECT + INSERT
  });

  it("replays the cached response on a matching hit (handler not run)", async () => {
    const request = { area: "M1" };
    mockSql.mockResolvedValueOnce([
      { request_hash: hashRequest(request), response_status: 200, response_body: { id: "cached" } },
    ] as never);
    const handler = vi.fn();
    const res = await withIdempotency("u1", "key-1", request, handler);
    expect(handler).not.toHaveBeenCalled();
    expect(res).toEqual({ status: 200, body: { id: "cached" }, replayed: true });
  });

  it("throws 409 when the same key is reused with a different body", async () => {
    mockSql.mockResolvedValueOnce([
      { request_hash: hashRequest({ area: "OTHER" }), response_status: 200, response_body: {} },
    ] as never);
    await expect(
      withIdempotency("u1", "key-1", { area: "M1" }, vi.fn())
    ).rejects.toMatchObject({ statusCode: 409, code: "IDEMPOTENCY_CONFLICT" });
  });
});
