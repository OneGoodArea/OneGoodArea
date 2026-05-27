import { SignJWT } from "jose";

/* ===========================================================================
   JWT SESSION BRIDGE — minting side (apps/web)
   ===========================================================================
   The counterpart to apps/api modules/auth/session-token.ts (verify side).

   apps/web owns NextAuth; apps/api is next-auth-free. To call apps/api on behalf
   of a logged-in user, the BFF (a Next server route/action) reads the NextAuth
   session, mints a SHORT-LIVED JWT here, and sends it as `Authorization: Bearer`
   on its server-to-server fetch (see ./api-client). apps/api verifies the
   signature + expiry and reads entitlements live from the DB by userId.

   Contract (must stay byte-identical to apps/api's verifier):
     - alg HS256, key = AUTH_SECRET (shared across apps/web + apps/api).
     - claims: sub = userId, plus iat + exp. Nothing else is trusted.
     - TTL: short (default 5m); minted fresh per request.

   This is server-only (needs AUTH_SECRET); never import it into client code.
   =========================================================================== */

const ALG = "HS256";
const DEFAULT_TTL = "5m";

/** Mint a bridge token for a userId. Throws if AUTH_SECRET is unset (a deploy
    misconfig that must fail loudly). */
export async function mintBridgeToken(
  userId: string,
  opts: { expiresIn?: string } = {},
): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? DEFAULT_TTL)
    .sign(new TextEncoder().encode(secret));
}
