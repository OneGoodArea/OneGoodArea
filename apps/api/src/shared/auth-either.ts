import type { FastifyRequest, FastifyReply } from "fastify";
import { verifySessionToken } from "../modules/auth/session-token";
import { validateApiKey } from "../modules/api-keys";
import { hasApiAccess } from "../modules/usage";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { clientIpOf } from "./http";

/** Dual-auth helper for org CRUD endpoints. Tries bridge token (session
   user) first — no rate limit, no plan check. Falls back to API key with
   the full requireApiAccess gate (auth + rate-limit + plan check).
   Returns userId on success, null (with 401/403/429 already sent) on failure.
   Used by Phase 1C to let both apps/web dashboard and external API consumers
   hit the same /v1/orgs/* endpoints. */
export async function authenticateEither(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  const token = header.slice(7);

  // 1. Try bridge token (session user — no rate limit, no plan check)
  const session = await verifySessionToken(token);
  if (session) return session.userId;

  // 2. Fall back to API key — full gate
  const result = await validateApiKey(token, clientIpOf(request));
  if (!result) {
    reply.code(401).send({ error: "Invalid or revoked API key" });
    return null;
  }
  if ("blocked" in result) {
    reply.code(403).send({
      error: "Request IP is not in the key's allowlist.",
      code: result.blocked,
    });
    return null;
  }

  const rl = await rateLimit(`api:${token}`, {
    max: RATE_LIMITS.apiReport.max,
    windowSeconds: RATE_LIMITS.apiReport.windowSeconds,
  });
  reply.headers(rateLimitHeaders(RATE_LIMITS.apiReport.max, rl));
  if (!rl.success) {
    reply.code(429).send({ error: "Too many requests. Rate limit: 30 requests per minute." });
    return null;
  }

  if (!(await hasApiAccess(result.userId))) {
    reply.code(403).send({ error: "API access not available on your current plan. Upgrade at /pricing." });
    return null;
  }

  return result.userId;
}
