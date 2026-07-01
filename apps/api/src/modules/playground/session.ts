/* Playground session cookie.

   The demo cookie is a self-contained, HMAC-signed JSON payload. No DB
   round-trip on every request; state lives client-side. Global + per-IP
   ceilings ARE tracked in the DB (see rate-limit.ts) because those are
   cross-cookie invariants that can't live in the client.

   Cookie shape:
     {
       sid: <opaque UUID>,
       iat: <issued-at, unix seconds>,
       exp: <expiry, unix seconds — 24h after issue>,
       tv:  <boolean, Turnstile verified>,
       tc:  <int, total playground calls used>,
       nc:  <int, NL /v1/query calls used>,
     }
     .<hex hmac-sha256 signature over the JSON>

   Signature secret comes from PLAYGROUND_COOKIE_SECRET. Missing secret
   causes a startup-time throw so we never accidentally ship with an
   unsigned cookie. The signature scheme is a plain shared-secret HMAC
   because there's no requirement to interop with anyone else. */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PLAYGROUND_COOKIE_NAME = "oga_playground";
export const PLAYGROUND_COOKIE_TTL_SECONDS = 60 * 60 * 24; // 24h

export interface PlaygroundSession {
  /** Opaque session id, useful for correlating logs. */
  sid: string;
  /** Issued-at, unix seconds. */
  iat: number;
  /** Expiry, unix seconds. */
  exp: number;
  /** Turnstile verified. False when Turnstile isn't configured, or the
      user hasn't completed a challenge yet. */
  tv: boolean;
  /** Total playground proxy calls used so far. */
  tc: number;
  /** NL /v1/query calls used so far (subset of tc; separate cap). */
  nc: number;
}

function getSecret(): string {
  const s = process.env.PLAYGROUND_COOKIE_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "PLAYGROUND_COOKIE_SECRET missing or too short (needs 32+ chars). Playground routes cannot start.",
    );
  }
  return s;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Serialize + sign a session. Returns the cookie value string. */
export function encodeSession(session: PlaygroundSession): string {
  const payload = JSON.stringify(session);
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = sign(encoded, getSecret());
  return `${encoded}.${sig}`;
}

/** Verify + parse a cookie value. Returns null on invalid signature,
    malformed JSON, or an expired session. Never throws. */
export function decodeSession(raw: string | undefined | null, nowSeconds: number = Math.floor(Date.now() / 1000)): PlaygroundSession | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  const encoded = raw.slice(0, dot);
  const sigHex = raw.slice(dot + 1);
  let expectedHex: string;
  try {
    expectedHex = sign(encoded, getSecret());
  } catch {
    return null;
  }
  if (sigHex.length !== expectedHex.length) return null;
  let ok = false;
  try {
    ok = timingSafeEqual(Buffer.from(sigHex, "hex"), Buffer.from(expectedHex, "hex"));
  } catch {
    return null;
  }
  if (!ok) return null;

  let session: PlaygroundSession;
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    session = JSON.parse(json) as PlaygroundSession;
  } catch {
    return null;
  }
  if (
    typeof session.sid !== "string" ||
    typeof session.iat !== "number" ||
    typeof session.exp !== "number" ||
    typeof session.tv !== "boolean" ||
    typeof session.tc !== "number" ||
    typeof session.nc !== "number"
  ) {
    return null;
  }
  if (session.exp <= nowSeconds) return null;
  return session;
}

/** Mint a fresh session with defaults. */
export function newSession(opts: { turnstileVerified: boolean; nowSeconds?: number } = { turnstileVerified: false }): PlaygroundSession {
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  return {
    sid: randomBytes(12).toString("hex"),
    iat: now,
    exp: now + PLAYGROUND_COOKIE_TTL_SECONDS,
    tv: opts.turnstileVerified,
    tc: 0,
    nc: 0,
  };
}

/** Build the Set-Cookie header value for the session cookie. */
export function setCookieHeader(sessionValue: string): string {
  const attrs = [
    `${PLAYGROUND_COOKIE_NAME}=${sessionValue}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${PLAYGROUND_COOKIE_TTL_SECONDS}`,
  ];
  return attrs.join("; ");
}

/** Extract the playground cookie value from a Cookie header. */
export function readCookieFromHeader(cookieHeader: string | undefined | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const p of parts) {
    const [name, ...rest] = p.trim().split("=");
    if (name === PLAYGROUND_COOKIE_NAME) return rest.join("=").trim();
  }
  return null;
}
