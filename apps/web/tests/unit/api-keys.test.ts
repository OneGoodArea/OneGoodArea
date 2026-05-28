import { describe, it, expect } from "vitest";
import { hashApiKey, apiKeyPreview } from "@/lib/api-keys";

/* AR-127 verification suite. These tests cover the pure crypto / format
   helpers used by createApiKey + validateApiKey. The DB integration is
   covered separately when Marcos's local-runtime container is wired into
   the test workflow. */

describe("AR-127: hashApiKey", () => {
  it("returns a 64-char hex SHA-256 digest", () => {
    const hash = hashApiKey("aiq_test_known_input");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic — same input always produces the same hash", () => {
    const a = hashApiKey("aiq_deadbeef0123456789");
    const b = hashApiKey("aiq_deadbeef0123456789");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = hashApiKey("aiq_aaaa");
    const b = hashApiKey("aiq_bbbb");
    expect(a).not.toBe(b);
  });

  it("matches known SHA-256 reference value for a fixed input", () => {
    // sha256("aiq_test") — canonical reference, frozen so regressions in the
    // crypto layer surface as a test failure rather than a silent behaviour change.
    expect(hashApiKey("aiq_test")).toBe(
      "f8ab6eb3066109e3b609f382628cc0e91cf69102bd8879c4da48f1b9a876209d"
    );
  });

  it("handles long random tokens (48 hex chars + prefix)", () => {
    const realKey = "aiq_" + "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718";
    const hash = hashApiKey(realKey);
    expect(hash).toHaveLength(64);
  });
});

describe("AR-127: apiKeyPreview", () => {
  it("renders aiq_<first-8>...<last-4> for a real-shape key", () => {
    const key = "aiq_a1b2c3d4e5f60718293a4b5c6d7e8f90";
    expect(apiKeyPreview(key)).toBe("aiq_a1b2c3d4...8f90");
  });

  it("is much shorter than the input key", () => {
    const key = "aiq_" + "0".repeat(48);
    const preview = apiKeyPreview(key);
    expect(preview.length).toBeLessThan(key.length);
    expect(preview.length).toBe(19); // 12 + 3 (ellipsis) + 4 = 19 chars
  });

  it("preserves the aiq_ prefix for visual identification", () => {
    const key = "aiq_abc123def456ghi789";
    expect(apiKeyPreview(key).startsWith("aiq_")).toBe(true);
  });

  it("reveals the last 4 chars so users can match against rotated copies", () => {
    const key = "aiq_aaaaaaaaaaaaaaaaaaaa1234";
    expect(apiKeyPreview(key).endsWith("1234")).toBe(true);
  });
});
