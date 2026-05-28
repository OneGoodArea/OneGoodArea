import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { SignJWT } from "jose";
import { signSessionToken, verifySessionToken } from "@/modules/auth/session-token";

const SECRET = "test-auth-secret-0123456789";
const key = () => new TextEncoder().encode(SECRET);

beforeEach(() => {
  process.env.AUTH_SECRET = SECRET;
});

afterAll(() => {
  delete process.env.AUTH_SECRET;
});

describe("session-token bridge", () => {
  it("round-trips: a freshly signed token verifies to its userId", async () => {
    const token = await signSessionToken("user_123");
    expect(await verifySessionToken(token)).toEqual({ userId: "user_123" });
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken("user_123");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects an expired token", async () => {
    // Mint directly with an exp in the past (signSessionToken only takes future TTLs).
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_123")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 300)
      .sign(key());
    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_123")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(new TextEncoder().encode("a-totally-different-secret"));
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects garbage that is not a JWT", async () => {
    expect(await verifySessionToken("not.a.jwt")).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("oga_live_abc123")).toBeNull();
  });

  it("rejects a token with an empty subject", async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key());
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("fails closed when AUTH_SECRET is unset: verify returns null, sign throws", async () => {
    const token = await signSessionToken("user_123");
    delete process.env.AUTH_SECRET;
    expect(await verifySessionToken(token)).toBeNull();
    await expect(signSessionToken("user_123")).rejects.toThrow("AUTH_SECRET is not configured");
  });
});
