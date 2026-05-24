import { SignJWT, jwtVerify } from "jose";

/* ===========================================================================
   JWT SESSION BRIDGE  (ADR — review with Marcos before the apps/web cutover)
   ===========================================================================

   apps/api is a standalone Fastify service and must NOT depend on next-auth.
   NextAuth (OAuth providers, the credentials flow, cookies, /api/auth/*) stays
   in apps/web. To authenticate a logged-in *user* (as opposed to a programmatic
   API-key caller) against apps/api, we use a stateless bridge:

     1. apps/web reads the NextAuth session server-side (it has next-auth).
     2. apps/web mints a SHORT-LIVED JWT signed with the shared AUTH_SECRET,
        carrying only `sub = userId`, and sends it to apps/api as
        `Authorization: Bearer <jwt>` on its server-to-server fetch.
     3. apps/api verifies the signature + expiry here. No DB session lookup.
        Entitlements (plan, quota, add-ons) are always read live from the DB by
        userId, never trusted from the token — so a stale token can never grant
        stale entitlements.

   Contract (v1):
     - alg HS256, key = AUTH_SECRET (the same secret next-auth uses, shared via
       env across apps/web + apps/api → one trust domain).
     - claims: `sub` (userId), standard `iat` + `exp`. Nothing else is trusted.
     - TTL: short (default 5m). apps/web mints fresh per request, so a leaked
       token is useful only briefly.
     - transport: a Bearer token set by apps/web's *server*, distinct from the
       `oga_`/`aiq_` API keys (those carry programmatic auth on different routes).

   The signSessionToken half is exported so tests can mint valid tokens and so
   apps/web's minting can mirror this exact contract (or import it once the
   bridge moves to a shared server package). Minting is wired in apps/web at the
   Phase 4 cutover; apps/api only needs to VERIFY today.
   =========================================================================== */

const ALG = "HS256";
const DEFAULT_TTL = "5m";

/** The shared signing key, or null when AUTH_SECRET is unset (so verification
    fails closed rather than throwing on every request). */
function secretKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/** Mint a bridge token for a userId. Throws if AUTH_SECRET is unset (a misconfig
    that must surface loudly on the minting side). */
export async function signSessionToken(
  userId: string,
  opts: { expiresIn?: string } = {},
): Promise<string> {
  const key = secretKey();
  if (!key) throw new Error("AUTH_SECRET is not configured");
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? DEFAULT_TTL)
    .sign(key);
}

/** Verify a bridge token. Returns the userId, or null for any failure (missing
    secret, bad signature, expired, malformed, wrong algorithm, empty subject).
    Fails closed — never throws. */
export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}
