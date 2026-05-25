import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { hashPassword, verifyPassword, generateToken } from "./crypto";

describe("crypto", () => {
  it("hashes to the salt:hash base64 format and round-trips", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    const { valid, needsRehash } = await verifyPassword("correct horse battery staple", hash);
    expect(valid).toBe(true);
    expect(needsRehash).toBe(false);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("right");
    const { valid } = await verifyPassword("wrong", hash);
    expect(valid).toBe(false);
  });

  it("produces a unique salt per hash (same password -> different hashes)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect((await verifyPassword("same", a)).valid).toBe(true);
    expect((await verifyPassword("same", b)).valid).toBe(true);
  });

  it("validates a legacy SHA-256 hex hash and flags it for rehash", async () => {
    const legacy = createHash("sha256").update("legacy-pw").digest("hex");
    const { valid, needsRehash } = await verifyPassword("legacy-pw", legacy);
    expect(valid).toBe(true);
    expect(needsRehash).toBe(true); // signal caller to upgrade to PBKDF2
  });

  it("rejects a wrong password against a legacy hash (no rehash)", async () => {
    const legacy = createHash("sha256").update("legacy-pw").digest("hex");
    const { valid, needsRehash } = await verifyPassword("nope", legacy);
    expect(valid).toBe(false);
    expect(needsRehash).toBe(false);
  });

  it("generates a 64-char hex token, unique per call", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});
