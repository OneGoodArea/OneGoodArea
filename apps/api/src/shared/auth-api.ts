import type { FastifyRequest, FastifyReply } from "fastify";
import { validateApiKey } from "../modules/api-keys";
import { hasApiAccess, canMakeApiCall } from "../modules/usage";
import { PLANS } from "../modules/billing/plans";
import { rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { clientIpOf } from "./http";
import { resolveTier, checkQuota, TIERS, type Tier } from "../modules/tiers";

/** Bearer-token auth. Resolves the userId, or sends a 401/403 and
   resolves null. Shared by every Bearer-authenticated route.

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

/** Auth + per-key rate-limit + plan API-access gate. Bearer auth ->
   resolve tier -> checkQuota (tier-based rate limit) -> hasApiAccess. On
   any failure it sends the response and resolves null; on success it
   resolves the userId with rate-limit headers already on the reply. */
export async function requireApiAccess(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const userId = await authenticate(request, reply);
  if (!userId) return null; // 401 already sent
  const apiKey = (request.headers.authorization ?? "").slice(7);

  // AR-499: resolve tier and use tier-based quota
  const tier = await resolveTier({ userId, hasApiKey: true });
  const quota = await checkQuota(tier, `api:${apiKey}`);
  reply.headers(rateLimitHeaders(RATE_LIMITS.apiReport.max, {
    success: quota.allowed,
    remaining: quota.remaining ?? RATE_LIMITS.apiReport.max,
    reset: quota.reset ?? 0,
  }));
  if (!quota.allowed) {
    reply.code(429).send({ error: quota.reason ?? "Too many requests." });
    return null;
  }

  if (!(await hasApiAccess(userId))) {
    reply.code(403).send({ error: "API access not available on your current plan. Upgrade at /pricing." });
    return null;
  }

  /* AR-488: enforce the monthly total-call quota for hard-overage tiers
     (sandbox, starter_v2, and the v1 legacy tiers). Soft-overage tiers
     (build / scale / growth) are allowed to exceed and bill the overage;
     superuser has an Infinity limit so it never trips. Before this the
     quota was display-only and the free tier was unbounded production. */
  const monthlyQuota = await canMakeApiCall(userId);
  if (!monthlyQuota.allowed && PLANS[monthlyQuota.plan].overageMode === "hard") {
    reply.code(429).send({
      error: `Monthly call limit reached (${monthlyQuota.limit} calls on the ${PLANS[monthlyQuota.plan].name} plan). It resets at the start of next month. Upgrade at /pricing.`,
      code: "monthly_quota_exceeded",
    });
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
): Promise<{ userId: string; orgId: string | null; trainingOptout: boolean } | null> {
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
  //
  // AR-376: also lift `trainingOptout` so the planner-logs / brief-composer
  // inserts can decide whether to capture this request. Default FALSE
  // (participate) when the key validates without surfacing the field.
  const header = request.headers.authorization!;
  const result = await validateApiKey(header.slice(7), clientIpOf(request));
  if (!result) return { userId, orgId: null, trainingOptout: false };
  return {
    userId,
    orgId: result.orgId ?? null,
    trainingOptout: ("trainingOptout" in result ? result.trainingOptout : false) ?? false,
  };
}

/** Caller context that also carries the resolved tier, for routes that
    accept anonymous callers (AR-594, Plan 059.2). */
export interface CallerOrAnonymousContext {
  userId: string | null;
  orgId: string | null;
  trainingOptout: boolean;
  tier: Tier;
}

/** Variant of `requireApiAccessWithOrg` that also accepts callers with no
   Authorization header at all, resolving them to the `anonymous` tier
   keyed by request IP instead of 401ing (AR-594, Plan 059.2).

   Only routes explicitly allow-listed in `shared/require-credential.ts`
   ever reach this function with no header — every other route still
   401s in that preValidation hook before the handler runs. Callers who
   DO send a Bearer header get the exact same checks as
   `requireApiAccessWithOrg` (auth, tier quota, plan API access, monthly
   quota) — this never weakens auth for real callers. */
export async function requireApiAccessWithOrgOrAnonymous(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<CallerOrAnonymousContext | null> {
  const header = request.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const ctx = await requireApiAccessWithOrg(request, reply);
    if (!ctx) return null; // response already sent
    const tier = await resolveTier({ userId: ctx.userId, hasApiKey: true });
    return { ...ctx, tier };
  }

  const tier = await resolveTier({ userId: null, hasApiKey: false }); // always "anonymous"
  const quota = await checkQuota(tier, `anon-ip:${clientIpOf(request)}`);
  const limit = TIERS[tier].quota.max ?? 0;
  reply.headers(rateLimitHeaders(limit, {
    success: quota.allowed,
    remaining: quota.remaining ?? limit,
    reset: quota.reset ?? 0,
  }));
  if (!quota.allowed) {
    reply.code(429).send({ error: quota.reason ?? "Too many requests.", code: "anonymous_quota_exceeded" });
    return null;
  }

  return { userId: null, orgId: null, trainingOptout: false, tier };
}
