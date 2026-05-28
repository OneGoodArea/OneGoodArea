import { describe, it, expect } from "vitest";
import { hashRequest, parseIdempotencyKey } from "@/lib/idempotency";
import { AppError } from "@/lib/errors";

/* AR-128 verification suite. Covers the pure helpers used by withIdempotency.
   DB-backed round-trip coverage deferred to Marcos's local-runtime container. */

describe("AR-128: hashRequest", () => {
  it("produces a 64-char hex SHA-256 digest", () => {
    const hash = hashRequest({ area: "Manchester", intent: "moving" });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const a = hashRequest({ area: "Manchester", intent: "moving" });
    const b = hashRequest({ area: "Manchester", intent: "moving" });
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = hashRequest({ area: "Manchester", intent: "moving" });
    const b = hashRequest({ area: "London", intent: "moving" });
    expect(a).not.toBe(b);
  });

  it("produces different hashes for same area but different intent", () => {
    const a = hashRequest({ area: "Manchester", intent: "moving" });
    const b = hashRequest({ area: "Manchester", intent: "investing" });
    expect(a).not.toBe(b);
  });

  it("handles array payloads (batch body shape)", () => {
    const hash = hashRequest({
      items: [
        { area: "Manchester", intent: "moving" },
        { area: "London", intent: "business" },
      ],
    });
    expect(hash).toHaveLength(64);
  });

  it("changes hash when items order changes (JSON.stringify is order-sensitive)", () => {
    const a = hashRequest({ items: [{ area: "M1" }, { area: "L1" }] });
    const b = hashRequest({ items: [{ area: "L1" }, { area: "M1" }] });
    expect(a).not.toBe(b);
  });
});

describe("AR-128: parseIdempotencyKey", () => {
  it("returns null for null input", () => {
    expect(parseIdempotencyKey(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseIdempotencyKey("")).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    expect(parseIdempotencyKey("   ")).toBeNull();
  });

  it("trims and returns valid keys", () => {
    expect(parseIdempotencyKey("  abc-123  ")).toBe("abc-123");
  });

  it("accepts a typical UUID v4 string", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseIdempotencyKey(uuid)).toBe(uuid);
  });

  it("accepts arbitrary client-chosen strings", () => {
    expect(parseIdempotencyKey("retry-batch-1")).toBe("retry-batch-1");
    expect(parseIdempotencyKey("opaque-token-with-symbols_!@#$%")).toBe(
      "opaque-token-with-symbols_!@#$%",
    );
  });

  it("throws AppError for keys exceeding 255 chars", () => {
    const tooLong = "a".repeat(256);
    expect(() => parseIdempotencyKey(tooLong)).toThrow(AppError);
    try {
      parseIdempotencyKey(tooLong);
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(400);
      expect((e as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  it("accepts keys exactly at the 255-char limit", () => {
    const atLimit = "k".repeat(255);
    expect(parseIdempotencyKey(atLimit)).toBe(atLimit);
  });
});
