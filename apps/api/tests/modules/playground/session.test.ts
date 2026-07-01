import { describe, it, expect, beforeAll } from "vitest";
import {
  decodeSession,
  encodeSession,
  newSession,
  readCookieFromHeader,
  setCookieHeader,
  PLAYGROUND_COOKIE_NAME,
  PLAYGROUND_COOKIE_TTL_SECONDS,
} from "@/modules/playground/session";

beforeAll(() => {
  /* 32-char secret for HMAC. All tests share the same secret so encode
     + decode round-trip. Overriding in-place is fine for tests. */
  process.env.PLAYGROUND_COOKIE_SECRET = "a".repeat(48);
});

describe("newSession", () => {
  it("mints defaults with 24h TTL", () => {
    const now = 1_000_000;
    const s = newSession({ turnstileVerified: false, nowSeconds: now });
    expect(s.iat).toBe(now);
    expect(s.exp).toBe(now + PLAYGROUND_COOKIE_TTL_SECONDS);
    expect(s.tc).toBe(0);
    expect(s.nc).toBe(0);
    expect(s.tv).toBe(false);
    expect(s.sid).toHaveLength(24); // 12 random bytes -> 24 hex chars
  });

  it("stamps turnstile verified when the caller says so", () => {
    const s = newSession({ turnstileVerified: true });
    expect(s.tv).toBe(true);
  });
});

describe("encode + decode round-trip", () => {
  it("recovers the exact session across encode/decode", () => {
    const s = newSession({ turnstileVerified: true });
    s.tc = 5;
    s.nc = 2;
    const raw = encodeSession(s);
    const round = decodeSession(raw);
    expect(round).toEqual(s);
  });

  it("returns null on a tampered payload", () => {
    const s = newSession({ turnstileVerified: false });
    const raw = encodeSession(s);
    const [enc, sig] = raw.split(".");
    const tampered = Buffer.from(enc, "base64url").toString("utf8");
    const bumped = tampered.replace('"tc":0', '"tc":999");');
    const rewritten = Buffer.from(bumped, "utf8").toString("base64url") + "." + sig;
    expect(decodeSession(rewritten)).toBeNull();
  });

  it("returns null on a bad signature", () => {
    const s = newSession({ turnstileVerified: false });
    const raw = encodeSession(s);
    const badSig = "ff".repeat(32);
    const rewritten = raw.split(".")[0] + "." + badSig;
    expect(decodeSession(rewritten)).toBeNull();
  });

  it("returns null after expiry", () => {
    const now = 1_000_000;
    const s = newSession({ turnstileVerified: false, nowSeconds: now });
    const raw = encodeSession(s);
    /* Advance past expiry. */
    expect(decodeSession(raw, s.exp + 1)).toBeNull();
  });

  it("returns null on garbage input", () => {
    expect(decodeSession(null)).toBeNull();
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("not.actually.valid")).toBeNull();
  });

  it("throws when the secret is unconfigured", () => {
    const prev = process.env.PLAYGROUND_COOKIE_SECRET;
    process.env.PLAYGROUND_COOKIE_SECRET = "";
    const s = newSession({ turnstileVerified: false });
    expect(() => encodeSession(s)).toThrow(/PLAYGROUND_COOKIE_SECRET/);
    process.env.PLAYGROUND_COOKIE_SECRET = prev;
  });
});

describe("cookie header helpers", () => {
  it("emits the standard attributes", () => {
    const s = newSession({ turnstileVerified: true });
    const raw = encodeSession(s);
    const header = setCookieHeader(raw);
    expect(header).toContain(`${PLAYGROUND_COOKIE_NAME}=${raw}`);
    expect(header).toContain("Path=/");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain(`Max-Age=${PLAYGROUND_COOKIE_TTL_SECONDS}`);
  });

  it("reads the playground cookie from a multi-cookie header", () => {
    const raw = "abc.def";
    const header = `foo=bar; ${PLAYGROUND_COOKIE_NAME}=${raw}; other=x`;
    expect(readCookieFromHeader(header)).toBe(raw);
  });

  it("returns null when the header has no playground cookie", () => {
    expect(readCookieFromHeader("foo=bar; baz=qux")).toBeNull();
    expect(readCookieFromHeader(null)).toBeNull();
    expect(readCookieFromHeader(undefined)).toBeNull();
  });
});
