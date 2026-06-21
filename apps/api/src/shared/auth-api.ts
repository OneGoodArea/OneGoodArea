import type { FastifyRequest, FastifyReply } from "fastify";
import { validateApiKey } from "../modules/api-keys";
import { hasApiAccess } from "../modules/usage";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { clientIpOf } from "./http";

/** Bearer-token auth. Resolves the userId, or sends a 401/403 and
   resolves null. Shared by every authenticated route (today /me/reports;
   soon /v1/report).

   AR-200: also enforces the api_keys.allowed_ip_cidrs gate. A key with
   a non-empty allowlist whose request IP doesn't match returns a typed
   "blocked" shape from validateApiKey, which this helper surfaces as
   403 ip_not_allowed. Empty allowlist = no restriction (existing
   behaviour). */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
    return null;
  }
  const result = await validateApiKey(header.slice(7), clientIpOf(request));
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
  return result.userId;
}

/** Auth + per-key rate-limit + plan API-access gate shared by the webhooks CRUD
   routes. Mirrors the legacy /api/v1/webhooks gate exactly: bearer auth ->
   rate-limit `api:<key>` (the same apiReport budget /v1/report uses) ->
   hasApiAccess. On any failure it sends the response and resolves null; on
   success it resolves the userId with rate-limit headers already on the reply. */
export async function requireApiAccess(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const userId = await authenticate(request, reply);
  if (!userId) return null; // 401 already sent
  const apiKey = (request.headers.authorization ?? "").slice(7);

  const rl = await rateLimit(`api:${apiKey}`, {
    max: RATE_LIMITS.apiReport.max,
    windowSeconds: RATE_LIMITS.apiReport.windowSeconds,
  });
  reply.headers(rateLimitHeaders(RATE_LIMITS.apiReport.max, rl));
  if (!rl.success) {
    reply.code(429).send({ error: "Too many requests. Rate limit: 30 requests per minute." });
    return null;
  }

  if (!(await hasApiAccess(userId))) {
    reply.code(403).send({ error: "API access not available on your current plan. Upgrade at /pricing." });
    return null;
  }

  return userId;
}

/** Levers (AR-195): variant of `requireApiAccess` that ALSO returns the
   caller's org context. Same gate semantics (auth → rate-limit → plan
   API access) — just surfaces `{userId, orgId}` on success.

   orgId comes straight from the api-key row (which AR-193 backfilled).
   For the legacy edge case of a key with `org_id = NULL`, the actual
   fallback (first-owner org lookup) is deferred to
   `resolveBundleForCaller` so endpoints that don't use bundles don't
   pay for the lookup. */
export async function requireApiAccessWithOrg(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ userId: string; orgId: string | null } | null> {
  const userId = await requireApiAccess(request, reply);
  if (!userId) return null;
  // The key just validated above — re-extract orgId from the same row.
  // Cheap: a single hash-indexed SELECT. The alternative (passing the
  // full {userId, orgId} shape through `requireApiAccess`) would churn
  // 30+ endpoints + their test mocks for a feature only a few endpoints
  // need.
  //
  // AR-200: pass clientIp so the second validateApiKey call has the same
  // gate behaviour as the first. The `blocked` branch carries orgId too,
  // so we surface it identically.
  const header = request.headers.authorization!;
  const result = await validateApiKey(header.slice(7), clientIpOf(request));
  if (!result) return { userId, orgId: null };
  return { userId, orgId: result.orgId ?? null };
}
