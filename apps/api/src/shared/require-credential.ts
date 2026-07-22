/* AR-548: reject unauthenticated callers before request validation runs.

   Fastify's lifecycle is onRequest -> preParsing -> preValidation -> validation
   -> preHandler -> handler. Every route in this service authenticates INSIDE
   its handler, which is after validation, so an anonymous caller sending a
   malformed body got a 400 describing the schema instead of a 401. That
   inverts the documented contract, spends validation work on unauthenticated
   input, and is why AR-501's schemas flipped several 401s to 400s.

   This preValidation hook restores 401-first. It only checks that a credential
   is PRESENT, never that it is valid: the handlers still run the real checks
   (signature, revocation, IP allowlist, plan gates), so this adds an outer
   guard rather than moving the security boundary.

   Scope is opt-in, keyed on the route declaring `security` in its schema. A
   route with no `security` (health, meta, auth, track, contact, the Stripe
   webhook) is untouched, so no public endpoint can start 401ing by accident.
   Adding `security` to a route both documents it in the OpenAPI spec and
   enrols it here. */

import type { FastifyRequest, FastifyReply } from "fastify";

interface RouteSecurity {
  security?: Array<Record<string, unknown>>;
}

/** Every auth path in this service reads `Authorization: Bearer <token>`:
    api keys via authenticate(), the apps/web JWT bridge via
    authenticateSession(), and the cron secret. The scheme names differ in the
    OpenAPI spec only, so presence of the header is the single check. */
export async function requireCredential(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const schema = request.routeOptions?.schema as RouteSecurity | undefined;
  const security = schema?.security;
  if (!Array.isArray(security) || security.length === 0) return;

  const header = request.headers.authorization;
  if (header && header.startsWith("Bearer ")) return;

  /* Keep each family's existing 401 body so API consumers see the same
     actionable message they did before this hook existed. */
  const schemes = security.flatMap((entry) => Object.keys(entry));
  const isApiKeyRoute = schemes.includes("bearerAuth");
  reply.code(401).send({
    error: isApiKeyRoute
      ? "Missing API key. Use: Authorization: Bearer oga_..."
      : "Unauthorized",
  });
}
