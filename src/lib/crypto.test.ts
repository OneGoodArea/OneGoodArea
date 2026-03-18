import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateToken } from "./crypto";

describe("crypto", () => {
  describe("hashPassword + verifyPassword", () => {
    it("hashes and verifies a password correctly", async () => {
      const hash = await hashPassword("test-password-123");
      const result = await verifyPassword("test-password-123", hash);
      expect(result.valid).toBe(true);
      expect(result.needsRehash).toBe(false);
    });

    it("rejects wrong password", async () => {
      const hash = await hashPassword("correct-password");
      const result = await verifyPassword("wrong-password", hash);
      expect(result.valid).toBe(false);
    });

    it("produces different hashes for the same password (random salt)", async () => {
      const hash1 = await hashPassword("same-password");
      const hash2 = await hashPassword("same-password");
      expect(hash1).not.toBe(hash2);
    });

    it("hash contains salt:hash format", async () => {
      const hash = await hashPassword("test");
      expect(hash).toContain(":");
      const parts = hash.split(":");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it("detects legacy SHA-256 hashes and flags for rehash", async () => {
      // Simulate a legacy SHA-256 hash (hex string, no colon)
      const encoder = new TextEncoder();
      const data = encoder.encode("legacy-password");
      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
      const legacyHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const result = await verifyPassword("legacy-password", legacyHash);
      expect(result.valid).toBe(true);
      expect(result.needsRehash).toBe(true);
    });
  });

  describe("generateToken", () => {
    it("returns a 64-character hex string", () => {
      const token = generateToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 50 }, () => generateToken()));
      expect(tokens.size).toBe(50);
    });
  });
});
