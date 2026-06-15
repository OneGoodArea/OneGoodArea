import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { INTENTS, type Intent, isIntent, SIGNAL_CATEGORIES, isSignalCategory } from "@onegoodarea/contracts";
import { validateApiKey, createApiKey, listApiKeys, revokeApiKey } from "./modules/api-keys";
import { verifySessionToken } from "./modules/auth/session-token";
import { hashPassword, verifyPassword, generateToken } from "./modules/auth/crypto";
import { normalizeSignupSource, SIGNUP_SOURCE_DEFAULT } from "./modules/auth/signup-source";
import { sendVerificationEmail, sendPasswordResetEmail, sendMagicLinkEmail, sendReportEmail } from "./infrastructure/email/senders";
import { sql } from "./infrastructure/db/client";
import {
  rows,
  row,
  type ReportRow,
  type SubscriptionRow,
  type ApiKeyRow,
  type ActivityEventRow,
  type UserRow,
  type PasswordResetTokenRow,
} from "./infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "./infrastructure/rate-limit";
import { RATE_LIMITS, BATCH_MAX_ITEMS, APP_URL, getConfig } from "./infrastructure/config";
import { getAreaProfile, queryAreas, parseAreasQuery } from "./modules/signals";
import { findPeers, parsePeersInput, PEERS_DEFAULT_K, PEERS_DEFAULT_MIN_SIGNALS, type Country as PeersCountry } from "./modules/signals/peers";
import { findInsights, parseInsightsInput, INSIGHTS_DEFAULT_K } from "./modules/signals/insights";
import { runForecast, parseForecastInput, FORECAST_DEFAULT_WINDOW, FORECAST_DEFAULT_HORIZON } from "./modules/signals/forecast";
import { geocodeArea } from "./modules/signals/data-sources/postcodes";
import { scoreArea, parseScoreBody } from "./modules/scoring";
import { createPortfolio, listPortfolios, getPortfolio, deletePortfolio, addAreas, enrichPortfolio, detectPortfolioChanges, PORTFOLIO_ADD_MAX, type Baseline } from "./modules/monitor";
import { runQuery, parseQueryRequest, AmbiguousLocationError } from "./modules/intelligence";
import { listForUser as listActivityForUser } from "./modules/activity";
import {
  createPersonalOrgForUser,
  listOrgsForUser,
  getOrgIfMember,
  getRoleInOrg,
  listMembers,
  createOrgWithOwner,
  updateOrg,
  addMember,
  removeMember,
  changeMemberRole,
  countOwners,
  hasAtLeastRole,
} from "./modules/orgs";
import {
  CreateOrgRequestSchema,
  UpdateOrgRequestSchema,
  AddMemberRequestSchema,
  UpdateMemberRoleRequestSchema,
  CreateInvitationRequestSchema,
  CreateBundleRequestSchema,
  UpdateBundleRequestSchema,
  CreatePresetRequestSchema,
  UpdatePresetRequestSchema,
  SetMethodologyPinRequestSchema,
  CreateCohortRequestSchema,
  UpdateCohortRequestSchema,
} from "@onegoodarea/contracts";
import {
  listBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
  findUnknownSignalKeys,
  filterSignalsByBundle,
  planSignalsOutsideBundle,
} from "./modules/orgs/bundles";
import {
  listPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
  findUnknownWeightKeys,
} from "./modules/orgs/presets";
import {
  getMethodologyPin,
  setMethodologyPin,
  clearMethodologyPin,
} from "./modules/orgs/methodology";
import {
  listCohorts,
  getCohort,
  createCohort,
  updateCohort,
  deleteCohort,
} from "./modules/orgs/cohorts";
import {
  listPendingInvitations,
  createInvitation,
  revokeInvitation,
  acceptInvitation,
} from "./modules/orgs/invitations";
import { getSupportedEngineVersions } from "./modules/reports/engine-version";
import {
  getUserPlan,
  hasApiAccess,
  canGenerateReport,
  hasMcpAccess,
  trackMcpCall,
  listAddons,
  getMcpUsageThisMonth,
  getMonthlyReportCount,
  getStripeCustomerId,
  getUserEmail,
  hasAddon,
  isSuperuser,
} from "./modules/usage";
import {
  PLANS,
  V2_PAID_PLANS,
  ADDONS,
  ADDON_KEYS,
  type PlanId,
  type AddonKey,
} from "./modules/billing/plans";
import { stripe } from "./modules/billing/stripe-client";
import { asSubscription } from "./modules/billing/stripe-types";
import { generateId } from "./infrastructure/utils/id";
import { validateLocationInput, validateIntent } from "./infrastructure/validation/validator";
import { resolveEngineVersion } from "./modules/reports/engine-version";
import { METHODOLOGY_VERSION } from "./modules/reports/methodology";
import { parseIdempotencyKey, withIdempotency } from "./infrastructure/idempotency";
import { generateReport } from "./modules/reports/report-generator";
import { getCachedReport } from "./modules/reports/report-cache";
import { runRescoreCron } from "./modules/reports/rescore";
import { type BatchItem, isBatchItemArray, isSuccess, processBatchItems } from "./modules/reports/batch";
import { trackEvent } from "./modules/tracking/activity";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  revokeWebhookSubscription,
  rotateWebhookSecret,
  validateWebhookUrl,
  validateEventTypes,
} from "./modules/webhooks";
import { getAnalytics, getTrafficAnalytics, getAudienceStats, getUsageStats } from "./modules/admin";

import { handleStripeWebhook } from "./modules/billing/webhook-handler";
import { isAppError } from "./infrastructure/errors/custom-errors";
import { logger } from "./modules/tracking/structured-logger";

declare module "fastify" {
  interface FastifyRequest {
    /** Raw request body string, preserved by the JSON content-type parser so the
        Stripe webhook can verify the HMAC signature over the exact payload. */
    rawBody?: string;
  }
}

/** Detect MCP-originated requests via the User-Agent stamp set by the MCP api-client. */
function isFromMcpServer(request: FastifyRequest): boolean {
  const ua = (request.headers["user-agent"] ?? "").toString().toLowerCase();
  return ua.includes("onegoodarea-mcp-server");
}

/** Coerce a Fastify header (string | string[] | undefined) to string | null. */
function headerString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Levers AR-200: resolve the request's client IP for IP-allowlist
    enforcement. Prefers the first segment of `x-forwarded-for`
    (Render/Vercel/most reverse proxies set this), falls back to
    Fastify's request.ip. Trimmed. */
function clientIpOf(request: FastifyRequest): string | null {
  const xff = headerString(request.headers["x-forwarded-for"]);
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.ip ?? null;
}

/** CORS headers for the public embeddable widget (callable from any site). */
function widgetCorsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };
}

/* Standalone backend factory.

   buildApp() is a pure factory so tests can drive it via app.inject() without
   binding a port. The reports vertical is migrated; endpoints are being wired
   on top of it. /v1/meta imports from @onegoodarea/contracts to prove the
   monorepo wiring (backend consumes the shared package). */

/** Bearer-token auth. Resolves the userId, or sends a 401/403 and
   resolves null. Shared by every authenticated route (today /me/reports;
   soon /v1/report).

   AR-200: also enforces the api_keys.allowed_ip_cidrs gate. A key with
   a non-empty allowlist whose request IP doesn't match returns a typed
   "blocked" shape from validateApiKey, which this helper surfaces as
   403 ip_not_allowed. Empty allowlist = no restriction (existing
   behaviour). */
async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
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
async function requireApiAccess(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
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
async function requireApiAccessWithOrg(
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

/** Dual-auth helper for org CRUD endpoints. Tries bridge token (session
   user) first — no rate limit, no plan check. Falls back to API key with
   the full requireApiAccess gate (auth + rate-limit + plan check).
   Returns userId on success, null (with 401/403/429 already sent) on failure.
   Used by Phase 1C to let both apps/web dashboard and external API consumers
   hit the same /v1/orgs/* endpoints. */
async function authenticateEither(
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


/** Session (browser-user) auth via the JWT bridge — the counterpart to
   authenticate() (programmatic api-key auth). Verifies the short-lived token
   apps/web's server mints from its NextAuth session and resolves the userId, or
   sends 401 and resolves null. Used by the session-only Stripe routes. */
async function authenticateSession(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  const session = await verifySessionToken(header.slice(7));
  if (!session) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  return session.userId;
}

/** Levers (AR-195): resolve a `?bundle=<id>` query param to the bundle's
   signal_keys whitelist. Returns:
   - `{ok: true, allowed: undefined}` when no bundle was requested (no filter)
   - `{ok: true, allowed: keys}` when the bundle exists in the caller's org
   - `{ok: false}` after sending 404 / 403 / 422 to the reply

   The caller must hold the org membership the bundle belongs to. Cross-org
   reads are rejected: a 404 covers both "no such bundle" and "wrong org"
   so no membership enumeration. */
/** Levers (AR-197): resolve the caller's effective org pin. Same lazy
   first-owner fallback as the bundle resolver — if the api-key row had
   `org_id = NULL` (legacy), find the caller's first-owner org and
   read its pin from there. Returns null when no pin is set (or when
   no org context is resolvable). */
async function resolveOrgPinForCaller(
  orgId: string | null,
  userId: string,
): Promise<string | null> {
  let effectiveOrgId = orgId;
  if (!effectiveOrgId) {
    const fallback = rows<{ org_id: string }>(await sql`
      SELECT org_id FROM org_members WHERE user_id = ${userId} AND role = 'owner'
       ORDER BY joined_at ASC LIMIT 1
    `);
    effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
  }
  if (!effectiveOrgId) return null;
  return await getMethodologyPin(effectiveOrgId);
}

/** Levers (AR-197): produce the X-Engine-Version stamp for a caller.
    Returns the org's pin (if set + still supported) else
    METHODOLOGY_VERSION (latest). Used by every product endpoint that
    stamps the response header. Pure passthrough of resolveEngineVersion's
    org-pin path; no per-request header consulted (the legacy AR-131
    header path on /v1/report continues to take precedence where wired).

    Defensive: a DB hiccup on the pin lookup must not 500 the product
    endpoint. Pin is opt-in; absent it, fall back to METHODOLOGY_VERSION. */
async function effectiveEngineVersionForCaller(
  orgId: string | null,
  userId: string,
): Promise<string> {
  let pin: string | null = null;
  try {
    pin = await resolveOrgPinForCaller(orgId, userId);
  } catch (e) {
    logger.error("[methodology] pin lookup failed; falling back to latest:", e);
    return METHODOLOGY_VERSION;
  }
  if (!pin) return METHODOLOGY_VERSION;
  const result = resolveEngineVersion(undefined, { orgPin: pin });
  return result.ok ? result.requestedVersion : METHODOLOGY_VERSION;
}

async function resolveBundleForCaller(
  bundleId: string | undefined,
  orgId: string | null,
  userId: string,
  reply: FastifyReply,
): Promise<{ ok: true; allowed: string[] | undefined } | { ok: false }> {
  if (!bundleId) return { ok: true, allowed: undefined };
  // Legacy-key fallback: if the api-key row had org_id = NULL (pre-
  // AR-193 backfill, or a future code path that created a key without
  // setting it), look up the caller's first-owner org. Most production
  // calls skip this branch because AR-193's backfill populated every
  // existing key.
  let effectiveOrgId = orgId;
  if (!effectiveOrgId) {
    const fallback = rows<{ org_id: string }>(await sql`
      SELECT org_id FROM org_members WHERE user_id = ${userId} AND role = 'owner'
       ORDER BY joined_at ASC LIMIT 1
    `);
    effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
  }
  if (!effectiveOrgId) {
    reply.code(422).send({
      error: "Cannot apply bundle filter: caller has no resolvable org context.",
      code: "no_org_context",
    });
    return { ok: false };
  }
  const bundle = await getBundle(effectiveOrgId, bundleId);
  if (!bundle) {
    reply.code(404).send({ error: "Bundle not found in your org." });
    return { ok: false };
  }
  return { ok: true, allowed: bundle.signal_keys };
}

/* Local row shapes for the API-key usage dashboard query (GET /keys/usage). */
interface CountRow { count: number; }
interface DayCountRow { day: string; count: number; }
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & { key_preview: string };

export async function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, ajv: { customOptions: { keywords: ["example"] } } });

  // OpenAPI/Swagger documentation — /docs (Swagger UI) and /openapi.json (raw spec).
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "OneGoodArea API",
        version: "1.0.0",
        description: "Area intelligence API — scores, signals, reports, and org management.",
      },
      servers: [{ url: process.env.API_PUBLIC_URL || "http://localhost:4000" }],
      tags: [
        { name: "Meta", description: "Health and version endpoints" },
        { name: "Reports", description: "Generate and retrieve area reports" },
        { name: "Signals", description: "Signal-first area profiles" },
        { name: "Scores", description: "Scoring engine" },
        { name: "Portfolios", description: "Portfolio management" },
        { name: "Orgs", description: "Organization and member management" },
        { name: "Invitations", description: "Org invitations" },
        { name: "Bundles", description: "Signal bundles" },
        { name: "Presets", description: "Scoring presets" },
        { name: "Methodology", description: "Engine version pins" },
        { name: "Cohorts", description: "Area cohorts" },
        { name: "Intelligence", description: "Query, peers, insights, forecast" },
        { name: "Webhooks", description: "Outbound webhook subscriptions" },
        { name: "Usage", description: "Plan and quota endpoints" },
        { name: "Keys", description: "API key management" },
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Stripe", description: "Billing and subscriptions" },
        { name: "Settings", description: "Account settings" },
        { name: "Dashboard", description: "Dashboard composite data" },
        { name: "Tracking", description: "Analytics and pageview tracking" },
        { name: "Watchlist", description: "Saved areas watchlist" },
        { name: "Admin", description: "Admin analytics (superuser only)" },
        { name: "Cron", description: "Scheduled jobs" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description: "API key from /keys. Header: Authorization: Bearer oga_live_...",
          },
          bridgeToken: {
            type: "http",
            scheme: "bearer",
            description: "Bridge token minted by the web BFF. Internal use only.",
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  // JSON parser that also stashes the raw body string on the request. Routes
  // still receive a parsed `request.body` (identical to Fastify's default); the
  // Stripe webhook additionally reads `request.rawBody` to verify the HMAC over
  // the exact payload bytes. Empty bodies error the same way the default does.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    // parseAs:"string" guarantees a string at runtime; Fastify still types it as
    // string | Buffer, so coerce for the type checker.
    const raw = typeof body === "string" ? body : body.toString("utf8");
    request.rawBody = raw;
    // An empty body is treated as "no body" (request.body = undefined) rather
    // than a parse error. The legacy Next routes never errored on an empty body
    // when content-type was application/json (e.g. a DELETE with the header set
    // but no payload), and route handlers already guard `request.body`.
    if (raw.length === 0) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      (err as { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });

  // Liveness probe for the container host (Render/Fly/etc.).
  app.get("/health",
    {
    schema: {
          "tags": [
              "Meta"
          ],
          "summary": "Health check",
          "description": "Liveness probe for container hosts."
      },
    }, async () => ({ status: "ok" }));

  // Proves apps/api can consume packages/contracts (shared source of truth).
  app.get("/v1/meta",
    {
    schema: {
          "tags": [
              "Meta"
          ],
          "summary": "API metadata",
          "description": "Returns supported intents, signal categories, and engine version."
      },
    }, async () => ({
    service: "onegoodarea-api",
    phase: "1-reports-vertical",
    intents: INTENTS,
  }));

  // The authenticated caller's recent reports (dashboard / "my reports" list).
  app.get("/me/reports",
    {
    schema: {
          "tags": [
              "Reports"
          ],
          "summary": "List my reports",
          "description": "Paginated list of reports generated by the authenticated user."
      },
    }, async (request, reply) => {
    const userId = await authenticate(request, reply);
    if (!userId) return reply; // 401 already sent

    const result = rows<ReportRow>(await sql`
      SELECT id, area, intent, score, created_at
      FROM reports
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `);

    return {
      reports: result.map((r) => ({
        id: r.id,
        area: r.area,
        intent: r.intent,
        score: r.score,
        created_at: r.created_at,
      })),
    };
  });

  /* AR-235 [AR-217-A18] Activity feed read.
     Session-authed via the bridge token apps/web mints from NextAuth.
     Paginated: ?page=1&page_size=20, page_size capped at 100. Returns
     the caller's activity_events rows ordered newest-first. */
  app.get("/me/activity",
    {
    schema: {
          "tags": [
              "Reports"
          ],
          "summary": "My activity log",
          "description": "Recent API activity for the authenticated user."
      },
    }, async (request, reply) => {
    const userId = await authenticateSession(request, reply);
    if (!userId) return reply;

    const query = request.query as { page?: string; page_size?: string };
    const rawPage = Number.parseInt(query.page ?? "1", 10);
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
    const rawSize = Number.parseInt(query.page_size ?? "20", 10);
    const pageSize =
      Number.isFinite(rawSize) ? Math.min(100, Math.max(1, rawSize)) : 20;

    const { events, total } = await listActivityForUser(userId, page, pageSize);
    return reply.code(200).send({
      events,
      total,
      page,
      page_size: pageSize,
    });
  });

  /* AR-313 Phase 0: BFF gate for /admin. Returns the session caller's
     superuser flag without exposing any other user state. Reuses
     isSuperuser() (AR-312) so the DB column is the only source of truth —
     no hardcoded ADMIN_EMAILS list anywhere. */
  app.get("/me/is-superuser",
    {
      schema: {
        tags: ["Admin"],
        summary: "Is the caller a superuser?",
        description: "Returns { is_superuser: boolean }. Session-authed; 401 if not signed in.",
      },
    },
    async (request, reply) => {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply;
      const is_superuser = await isSuperuser(userId);
      return reply.code(200).send({ is_superuser });
    });

  // The authenticated caller's plan + entitlements. Used by the MCP server at
  // startup to check mcpAccess, and by any consumer needing entitlement without
  // running a report. Migrated from the legacy /api/v1/me route.
  app.get("/v1/me",
    {
    schema: {
          "tags": [
              "Reports"
          ],
          "summary": "Current user profile",
          "description": "Returns the authenticated user's profile and usage stats."
      },
    }, async (request, reply) => {
    const authHeader = headerString(request.headers.authorization);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
    }
    const apiKey = authHeader.slice(7);
    const result = await validateApiKey(apiKey, clientIpOf(request));
    if (!result) return reply.code(401).send({ error: "Invalid or revoked API key" });
    if ("blocked" in result) {
      return reply.code(403).send({
        error: "Request IP is not in the key's allowlist.",
        code: result.blocked,
      });
    }
    const userId = result.userId;
    const orgIdFromKey = result.orgId;
    const allowedIpCidrs = result.allowedIpCidrs ?? [];

    // Rate-limit /me at the same level as /v1/report (MCP calls it once at
    // startup, but a misbehaving client could spam it).
    const rl = await rateLimit(`api-me:${apiKey}`, {
      max: RATE_LIMITS.apiReport.max,
      windowSeconds: RATE_LIMITS.apiReport.windowSeconds,
    });
    reply.headers(rateLimitHeaders(RATE_LIMITS.apiReport.max, rl));
    if (!rl.success) {
      return reply.code(429).send({ error: "Too many requests. Rate limit: 30 requests per minute." });
    }

    const [plan, apiAllowed, mcpAllowed, usage, addons, mcpUsed] = await Promise.all([
      getUserPlan(userId),
      hasApiAccess(userId),
      hasMcpAccess(userId),
      canGenerateReport(userId),
      listAddons(userId),
      getMcpUsageThisMonth(userId),
    ]);

    const planConfig = PLANS[plan];

    // Levers AR-200: surface the caller's org (with white-label fields)
    // + the key's IP allowlist on /v1/me. Resolves the org via the
    // api-key row's org_id, with the legacy first-owner fallback for
    // pre-AR-193 keys. Defensive — a DB hiccup on the org lookup
    // shouldn't 500 a meter / entitlement check that has nothing to
    // do with branding. Falls back to org: null.
    let orgInfo: {
      id: string;
      slug: string;
      name: string;
      display_name: string | null;
      brand_url: string | null;
      role: string;
    } | null = null;
    try {
      let effectiveOrgId = orgIdFromKey;
      if (!effectiveOrgId) {
        const fallback = rows<{ org_id: string }>(await sql`
          SELECT org_id FROM org_members WHERE user_id = ${userId} AND role = 'owner'
           ORDER BY joined_at ASC LIMIT 1
        `);
        effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
      }
      if (effectiveOrgId) {
        const orgRow = rows<{
          id: string; slug: string; name: string;
          display_name: string | null; brand_url: string | null;
          role: string;
        }>(await sql`
          SELECT o.id, o.slug, o.name, o.display_name, o.brand_url, m.role
            FROM orgs o
            JOIN org_members m ON m.org_id = o.id
           WHERE o.id = ${effectiveOrgId} AND m.user_id = ${userId}
           LIMIT 1
        `);
        if (orgRow.length > 0) {
          const r = orgRow[0];
          orgInfo = {
            id: r.id,
            slug: r.slug,
            name: r.name,
            display_name: r.display_name,
            brand_url: r.brand_url,
            role: r.role,
          };
        }
      }
    } catch (e) {
      logger.error("[v1/me] org lookup failed; returning org: null:", e);
    }

    return {
      plan,
      plan_name: planConfig?.name ?? plan,
      generation: planConfig?.generation ?? "v1",
      api_access: apiAllowed,
      mcp_access: mcpAllowed,
      reports_per_month: planConfig?.reportsPerMonth ?? 0,
      used_this_month: usage.used,
      limit_this_month: usage.limit === Infinity ? null : usage.limit,
      // Canonical engine version (the legacy route hardcoded a now-stale "2.0.0").
      engine_version: METHODOLOGY_VERSION,
      addons,
      mcp_calls_this_month: mcpUsed,
      // Levers AR-200: org branding + key allowlist (Enterprise polish).
      org: orgInfo,
      key: { allowed_ip_cidrs: allowedIpCidrs },
    };
  });

  // Generate (or replay) a report for a postcode/area. The public REST entry
  // point. Mirrors the legacy /api/v1/report route: auth -> rate-limit -> API
  // access -> monthly quota -> input validation -> engine-version pin -> MCP
  // gate -> idempotency-wrapped generateReport.
  app.post("/v1/report",
    {
    schema: {
          "tags": [
              "Reports"
          ],
          "summary": "Generate a report",
          "description": "Produces a decision-grade area report for a postcode or place name.",
          "body": { "type": "object", "properties": { "area": { "type": "string" }, "intent": { "type": "string" } }, "example": { "area": "SW1A 1AA", "intent": "moving" } }
      },
    }, async (request, reply) => {
    try {
      const authHeader = headerString(request.headers.authorization);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
      }
      const apiKey = authHeader.slice(7);
      const result = await validateApiKey(apiKey, clientIpOf(request));
      if (!result) return reply.code(401).send({ error: "Invalid or revoked API key" });
      if ("blocked" in result) {
        return reply.code(403).send({
          error: "Request IP is not in the key's allowlist.",
          code: result.blocked,
        });
      }
      const userId = result.userId;

      // Rate limit by API key.
      const rl = await rateLimit(`api:${apiKey}`, {
        max: RATE_LIMITS.apiReport.max,
        windowSeconds: RATE_LIMITS.apiReport.windowSeconds,
      });
      reply.headers(rateLimitHeaders(RATE_LIMITS.apiReport.max, rl));
      if (!rl.success) {
        return reply.code(429).send({ error: "Too many requests. Rate limit: 30 requests per minute." });
      }

      // Plan must grant API access.
      if (!(await hasApiAccess(userId))) {
        return reply.code(403).send({ error: "API access not available on your current plan. Upgrade at /pricing." });
      }

      // Monthly report quota.
      const usage = await canGenerateReport(userId);
      if (!usage.allowed) {
        return reply.code(429).send({ error: "Monthly report limit reached", used: usage.used, limit: usage.limit, plan: usage.plan });
      }

      // Validate inputs.
      const body = (request.body ?? {}) as { area?: unknown; intent?: unknown };
      const locationCheck = validateLocationInput(body.area);
      if (!locationCheck.valid) return reply.code(400).send({ error: locationCheck.error });
      const intentCheck = validateIntent(body.intent);
      if (!intentCheck.valid) return reply.code(400).send({ error: intentCheck.error });

      // AR-131: resolve X-Engine-Version pin before doing work.
      const engine = resolveEngineVersion(headerString(request.headers["x-engine-version"]));
      if (!engine.ok) {
        return reply.code(engine.statusCode).send({ error: engine.error, code: engine.code, supported_versions: engine.supportedVersions });
      }

      // MCP-originated requests need MCP entitlement.
      const fromMcp = isFromMcpServer(request);
      if (fromMcp && !(await hasMcpAccess(userId))) {
        return reply.code(403).send({
          error: "MCP server access not included on your plan. Add the £29/mo MCP add-on at /pricing or upgrade to Growth/Enterprise (included free).",
        });
      }

      // AR-128: idempotency. Same key + same body replays the cached response.
      const idempotencyKey = parseIdempotencyKey(headerString(request.headers["idempotency-key"]));
      const intent = body.intent as Intent;
      const idem = await withIdempotency(
        userId,
        idempotencyKey,
        { area: locationCheck.sanitized, intent },
        async () => {
          const result = await generateReport(locationCheck.sanitized, intent, userId);
          trackEvent("api.report.generated", userId, { area: body.area, intent, reportId: result.id, source: fromMcp ? "mcp" : "api" });
          if (fromMcp) {
            trackMcpCall(userId).catch((err) => logger.error("[v1/report] trackMcpCall failed:", err));
          }
          return { status: 200, body: { id: result.id, report: result.report } };
        },
      );

      reply.header("X-Idempotency-Replayed", String(idem.replayed));
      reply.header("X-Engine-Version", engine.resolvedVersion);
      return reply.code(idem.status).send(idem.body);
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/report] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // GET /v1/area — the signal-first primitive. Returns the full Signal catalog
  // for an area (raw values + per-signal confidence + source + period), with NO
  // scoring and NO AI. This is the endpoint that flips the product from a
  // "report API" to a "data-infrastructure API" (MASTER-PROPOSAL §4): signals
  // are the product, the score is a feature, the report is a surface.
  //
  // Dark-flagged behind OGA_SIGNALS_API: when off it 404s like an unknown route,
  // so it ships to the branch/prod additively and is enabled deliberately.
  // Gate = auth + per-key rate-limit + plan API access (the same requireApiAccess
  // gate the webhooks CRUD uses). The monthly REPORT quota deliberately does NOT
  // apply: no report is generated, so it is not metered against that allowance.
  app.get("/v1/area",
    {
    schema: {
          "tags": [
              "Signals"
          ],
          "summary": "Get area profile",
          "description": "Full signal profile for a UK postcode or place name. Returns geo metadata plus all signal categories with sources.",
          "querystring": { "type": "object", "properties": { "area": { "type": "string", "example": "SW1A 1AA" }, "postcode": { "type": "string" } } }
      },
    }, async (request, reply) => {
    try {
      if (!getConfig().signalsApiEnabled) {
        return reply.code(404).send({ error: "Not found" });
      }

      const ctx = await requireApiAccessWithOrg(request, reply);
      if (!ctx) return reply; // 401 / 403 / 429 already sent

      const q = request.query as { area?: unknown; postcode?: unknown; bundle?: unknown };
      const rawArea =
        typeof q.area === "string" ? q.area : typeof q.postcode === "string" ? q.postcode : undefined;
      const locationCheck = validateLocationInput(rawArea);
      if (!locationCheck.valid) return reply.code(400).send({ error: locationCheck.error });

      // Levers (AR-195): if ?bundle=<id> is set, resolve the bundle for the
      // caller's org and use its signal_keys as a whitelist over the
      // response. Absent the param, behaviour is unchanged.
      const bundleId = typeof q.bundle === "string" ? q.bundle : undefined;
      const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
      if (!resolved.ok) return reply;

      const profile = await getAreaProfile(locationCheck.sanitized);
      if (!profile) {
        return reply.code(404).send({
          error: `Could not resolve area "${locationCheck.sanitized}". Provide a UK postcode or place name.`,
        });
      }

      const filteredSignals = filterSignalsByBundle(profile.signals, resolved.allowed);
      const filteredSources = resolved.allowed
        ? Array.from(new Set(filteredSignals.filter((s) => s.value !== null).map((s) => s.source)))
        : profile.meta.sources;

      trackEvent("api.area.profiled", ctx.userId, {
        area: locationCheck.sanitized,
        signals: filteredSignals.length,
        sources: filteredSources.length,
        bundle: bundleId ?? null,
      });

      // Levers (AR-197): stamp the org pin (if set) on the response header.
      // Body `meta.engine_version` still reports what the engine actually
      // produced — until v3 freezes a separate engine module these are
      // equivalent in resolvedVersion, just distinguished by which one
      // the auditor cares about.
      const stamp = await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId);
      reply.header("X-Engine-Version", stamp);
      return reply.code(200).send({
        geo: profile.geo,
        signals: filteredSignals,
        meta: { ...profile.meta, sources: filteredSources },
      });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/area] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // GET /v1/signals/:category — the addressable single-category view (Plaid
  // style: "give me just the crime signals"). Returns an AreaProfile filtered to
  // one category, so it validates against the same shape callers already parse.
  // Same dark flag + gate as /v1/area. v1 still fans out to all sources then
  // filters (the persisted store makes single-category reads cheap later).
  app.get("/v1/signals/:category",
    {
    schema: {
          "tags": [
              "Signals"
          ],
          "summary": "Get signals by category",
          "description": "Returns all signals for a specific category (crime, deprivation, property, schools, amenities, transport, environment)."
      },
    }, async (request, reply) => {
    try {
      if (!getConfig().signalsApiEnabled) {
        return reply.code(404).send({ error: "Not found" });
      }

      const userId = await requireApiAccess(request, reply);
      if (!userId) return reply; // 401 / 403 / 429 already sent

      const { category } = request.params as { category: string };
      if (!isSignalCategory(category)) {
        return reply.code(400).send({
          error: `Unknown signal category "${category}". Valid categories: ${SIGNAL_CATEGORIES.join(", ")}.`,
        });
      }

      const q = request.query as { area?: unknown; postcode?: unknown };
      const rawArea =
        typeof q.area === "string" ? q.area : typeof q.postcode === "string" ? q.postcode : undefined;
      const locationCheck = validateLocationInput(rawArea);
      if (!locationCheck.valid) return reply.code(400).send({ error: locationCheck.error });

      const profile = await getAreaProfile(locationCheck.sanitized);
      if (!profile) {
        return reply.code(404).send({
          error: `Could not resolve area "${locationCheck.sanitized}". Provide a UK postcode or place name.`,
        });
      }

      const signals = profile.signals.filter((s) => s.category === category);
      const sources = Array.from(new Set(signals.filter((s) => s.value !== null).map((s) => s.source)));

      trackEvent("api.signals.category", userId, {
        area: locationCheck.sanitized,
        category,
        signals: signals.length,
      });

      reply.header("X-Engine-Version", profile.meta.engine_version);
      return reply.code(200).send({ geo: profile.geo, signals, meta: { ...profile.meta, sources } });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/signals] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // GET /v1/areas — cross-area query, the data-infrastructure differentiator.
  // "Find LSOAs (optionally within a country/LAD) where signal X is in the bottom
  // decile / above a threshold, ranked." Only the store can answer this; the
  // live-fetch path is one-area-at-a-time. Same dark flag + gate as /v1/area.
  app.get("/v1/areas",
    {
    schema: {
          "tags": [
              "Signals"
          ],
          "summary": "Query areas by signal",
          "description": "Rank areas by a signal value. Supports country/LAD scoping, percentile and value filters, and compound multi-signal queries."
      },
    }, async (request, reply) => {
    try {
      if (!getConfig().signalsApiEnabled) {
        return reply.code(404).send({ error: "Not found" });
      }
      const ctx = await requireApiAccessWithOrg(request, reply);
      if (!ctx) return reply; // 401 / 403 / 429 already sent

      const parsed = parseAreasQuery((request.query ?? {}) as Record<string, unknown>);
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

      // Levers (AR-195): if ?bundle=<id> is set, the requested ranking
      // signal MUST be in the bundle's whitelist — 422 otherwise. This is
      // a gate, not a filter (queryAreas takes one signal). The bundle
      // param is read from the raw query (parseAreasQuery doesn't expose
      // it but ignores unknown keys).
      const rawQuery = (request.query ?? {}) as { bundle?: unknown };
      const bundleId = typeof rawQuery.bundle === "string" ? rawQuery.bundle : undefined;
      const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
      if (!resolved.ok) return reply;
      if (resolved.allowed && !resolved.allowed.includes(parsed.query.signal)) {
        return reply.code(422).send({
          error: `Signal "${parsed.query.signal}" is not in bundle ${bundleId}.`,
          code: "bundle_signal_not_allowed",
        });
      }

      const areas = await queryAreas(parsed.query);

      trackEvent("api.areas.queried", ctx.userId, {
        signal: parsed.query.signal,
        country: parsed.query.country,
        lad: parsed.query.lad,
        results: areas.length,
        bundle: bundleId ?? null,
      });
      reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId));
      return reply.code(200).send({ signal: parsed.query.signal, count: areas.length, areas });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/areas] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // POST /v1/score — the Scores product: a deterministic composite score for an
  // area, by preset (the historical intents) or caller weights over the preset's
  // dimensions. Returns components + weights + confidence (transparent), no AI.
  // Same dark flag + gate as /v1/area; not metered against the monthly report
  // quota (no report is generated).
  app.post("/v1/score",
    {
    schema: {
          "tags": [
              "Scores"
          ],
          "summary": "Score an area",
          "description": "Deterministic composite score for an area by preset or custom weights. Returns component dimensions + confidence.",
          "body": { "type": "object", "properties": { "area": { "type": "string" }, "preset": { "type": "string" } }, "example": { "area": "M1 1AE", "preset": "business" } }
      },
    }, async (request, reply) => {
    try {
      if (!getConfig().signalsApiEnabled) {
        return reply.code(404).send({ error: "Not found" });
      }
      const ctx = await requireApiAccessWithOrg(request, reply);
      if (!ctx) return reply; // 401 / 403 / 429 already sent

      // Levers (AR-196): a `preset_id` body field resolves to an org-
      // saved preset. Mutually exclusive with explicit `preset` /
      // `weights` — passing both is ambiguous (which one wins?), so we
      // 422 rather than silently picking. Absent the field, behaviour
      // is unchanged.
      const body = (request.body ?? {}) as Record<string, unknown>;
      const presetId = typeof body.preset_id === "string" ? body.preset_id : undefined;
      let bodyForParse: unknown = request.body;

      if (presetId) {
        if (body.preset !== undefined || body.weights !== undefined) {
          return reply.code(422).send({
            error: "preset_id is mutually exclusive with preset / weights.",
            code: "preset_id_conflict",
          });
        }
        // Resolve the saved preset in the caller's org. Reuses the
        // lazy first-owner fallback for legacy keys with null org_id.
        let effectiveOrgId = ctx.orgId;
        if (!effectiveOrgId) {
          const fallback = rows<{ org_id: string }>(await sql`
            SELECT org_id FROM org_members WHERE user_id = ${ctx.userId} AND role = 'owner'
             ORDER BY joined_at ASC LIMIT 1
          `);
          effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
        }
        if (!effectiveOrgId) {
          return reply.code(422).send({
            error: "Cannot resolve preset_id: caller has no resolvable org context.",
            code: "no_org_context",
          });
        }
        const saved = await getPreset(effectiveOrgId, presetId);
        if (!saved) {
          return reply.code(404).send({ error: "Preset not found in your org." });
        }
        // Synthesize the "as if" body: caller passed preset = base + weights.
        // The response's weights_source will be "custom" — functionally
        // accurate (saved presets ARE custom weights). The audit trail
        // for which named preset_id was used lives in the activity event.
        bodyForParse = {
          ...body,
          preset: saved.base_preset,
          weights: saved.weights,
          preset_id: undefined,
        };
      }

      const parsed = parseScoreBody(bodyForParse);
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

      // AR-274 follow-on: bundle gate for /v1/score. Same param shape as
      // /v1/query (?bundle= OR body.bundle). The bundle's signal_keys
      // are passed to scoreArea, which nulls out sources whose category
      // prefixes aren't represented in the bundle. v2's computeScores
      // handles null sources by 0-confidencing the affected dimension;
      // applyWeights composes the partial score. v2's math is unchanged.
      const rawQuery = (request.query ?? {}) as { bundle?: unknown };
      const rawBody = (request.body ?? {}) as { bundle?: unknown };
      const bundleId =
        typeof rawQuery.bundle === "string" ? rawQuery.bundle :
        typeof rawBody.bundle === "string" ? rawBody.bundle : undefined;
      const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
      if (!resolved.ok) return reply;
      if (resolved.allowed) {
        parsed.query.bundle_allowed_keys = resolved.allowed;
      }

      const result = await scoreArea(parsed.query);
      if (!result) {
        return reply.code(404).send({
          error: `Could not resolve area "${parsed.query.area}". Provide a UK postcode or place name.`,
        });
      }

      trackEvent("api.score.computed", ctx.userId, {
        area: parsed.query.area,
        preset: parsed.query.preset,
        weights: parsed.query.weights ? "custom" : "preset",
        preset_id: presetId ?? null,
        bundle: bundleId ?? null,
        score: result.score,
      });
      reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId));
      if (bundleId) reply.header("X-Bundle-Applied", bundleId);
      return reply.code(200).send(result);
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/score] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Monitor: portfolios (the 3rd product) ──────────────────────────────
  // A user's tracked book of areas: CRUD + bulk enrich. Scoped to the api-key's
  // user (ownership). Same dark flag + gate as the rest of the signal surface.
  // A small helper keeps the six routes from repeating the flag+auth preamble.
  const guardSignals = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    if (!getConfig().signalsApiEnabled) { reply.code(404).send({ error: "Not found" }); return null; }
    return requireApiAccess(request, reply);
  };

  app.post("/v1/portfolios",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "Create portfolio",
          "description": "Create a new portfolio to track a book of areas.",
          "body": { "type": "object", "properties": { "name": { "type": "string" } }, "example": { "name": "London investments" } }
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      const name = typeof (request.body as { name?: unknown })?.name === "string" ? (request.body as { name: string }).name.trim() : "";
      if (!name) return reply.code(400).send({ error: "Missing required 'name'." });
      if (name.length > 200) return reply.code(400).send({ error: "name too long (max 200 chars)." });
      const portfolio = await createPortfolio(userId, name);
      trackEvent("api.portfolio.created", userId, { portfolioId: portfolio.id });
      return reply.code(201).send(portfolio);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios] create error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/portfolios",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "List portfolios",
          "description": "List all portfolios for the authenticated user."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      return reply.code(200).send({ portfolios: await listPortfolios(userId) });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/portfolios/:id",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "Get portfolio",
          "description": "Get a portfolio with its tracked areas."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const portfolio = await getPortfolio(userId, id);
      if (!portfolio) return reply.code(404).send({ error: "Portfolio not found" });
      return reply.code(200).send(portfolio);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios/:id] get error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/portfolios/:id",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "Delete portfolio",
          "description": "Delete a portfolio and its tracked areas."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const ok = await deletePortfolio(userId, id);
      if (!ok) return reply.code(404).send({ error: "Portfolio not found" });
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios/:id] delete error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.post("/v1/portfolios/:id/areas",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "Add areas to portfolio",
          "description": "Add one or more areas to a portfolio."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const body = request.body as { areas?: unknown };
      if (!Array.isArray(body?.areas) || body.areas.length === 0) {
        return reply.code(400).send({ error: "Body must be { areas: [{ area, label? }, ...] }." });
      }
      if (body.areas.length > PORTFOLIO_ADD_MAX) {
        return reply.code(400).send({ error: `Too many areas (${body.areas.length}); max ${PORTFOLIO_ADD_MAX} per call.` });
      }
      const areas: { area: string; label?: string | null }[] = [];
      for (const item of body.areas) {
        const a = (item as { area?: unknown; label?: unknown });
        if (typeof a?.area !== "string" || !a.area.trim()) {
          return reply.code(400).send({ error: "Each area needs a non-empty 'area' string." });
        }
        areas.push({ area: a.area.trim(), label: typeof a.label === "string" ? a.label : null });
      }
      const result = await addAreas(userId, id, areas);
      if (!result) return reply.code(404).send({ error: "Portfolio not found" });
      trackEvent("api.portfolio.areas_added", userId, { portfolioId: id, added: result.added });
      return reply.code(200).send(result);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios/:id/areas] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.post("/v1/portfolios/:id/enrich",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "Enrich portfolio",
          "description": "Bulk-score every area in the portfolio."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const presetRaw = (request.body as { preset?: unknown })?.preset;
      if (presetRaw !== undefined && !isIntent(presetRaw)) {
        return reply.code(400).send({ error: "preset must be one of: moving, business, investing, research." });
      }
      const items = await enrichPortfolio(userId, id, (presetRaw as Intent) ?? "research");
      if (!items) return reply.code(404).send({ error: "Portfolio not found" });
      trackEvent("api.portfolio.enriched", userId, { portfolioId: id, areas: items.length });
      reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(null, userId));
      return reply.code(200).send({ count: items.length, results: items });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios/:id/enrich] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Change detection: diff the portfolio's areas across time-series periods,
  // fire signal.changed webhooks for material moves. Needs accrued history
  // (prices move; deprivation is static).
  app.post("/v1/portfolios/:id/changes",
    {
    schema: {
          "tags": [
              "Portfolios"
          ],
          "summary": "Detect portfolio changes",
          "description": "Detect material signal changes for tracked areas between periods."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { baseline?: unknown; threshold_pct?: unknown; min_transactions?: unknown; emit?: unknown };

      if (body.baseline !== undefined && body.baseline !== "previous" && body.baseline !== "first") {
        return reply.code(400).send({ error: "baseline must be 'previous' or 'first'." });
      }
      let thresholdPct: number | undefined;
      if (body.threshold_pct !== undefined) {
        thresholdPct = Number(body.threshold_pct);
        if (!Number.isFinite(thresholdPct) || thresholdPct < 0) {
          return reply.code(400).send({ error: "threshold_pct must be a non-negative number." });
        }
      }
      let minTransactions: number | undefined;
      if (body.min_transactions !== undefined) {
        minTransactions = Number(body.min_transactions);
        if (!Number.isFinite(minTransactions) || minTransactions < 0) {
          return reply.code(400).send({ error: "min_transactions must be a non-negative number." });
        }
      }

      const report = await detectPortfolioChanges(userId, id, {
        baseline: body.baseline as Baseline | undefined,
        thresholdPct,
        minTransactions,
        emit: body.emit === undefined ? true : Boolean(body.emit),
      });
      if (!report) return reply.code(404).send({ error: "Portfolio not found" });
      trackEvent("api.portfolio.changes_checked", userId, { portfolioId: id, material: report.material_count });
      reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(null, userId));
      return reply.code(200).send(report);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/portfolios/:id/changes] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Levers (AR-194): per-org tenancy CRUD ──
  //
  // Orgs are the unit of Levers config (custom signal bundles, custom
  // scoring presets, per-org peer graphs, RBAC, white-label, IP allow).
  // This commit ships the CRUD primitives; subsequent Levers commits
  // layer per-org config on top.
  //
  // Auth model: api-key (requireApiAccess) on everything. Session-mode
  // (apps/web dashboard) will route via the BFF bridge → same endpoints.
  // Mutations are owner-only; reads are member+.

  app.post("/v1/orgs",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "Create organization",
          "description": "Creates a new organization. The caller becomes the owner.",
          "body": { "type": "object", "properties": { "name": { "type": "string" }, "slug": { "type": "string" } }, "example": { "name": "Acme Corp", "slug": "acme-corp" } }
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const parsed = CreateOrgRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const org = await createOrgWithOwner({
        name: parsed.data.name,
        slug: parsed.data.slug,
        userId,
      });
      trackEvent("api.org.created", userId, { orgId: org.id });
      return reply.code(201).send(org);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs] create error:", error);
      // Most likely a slug collision (UNIQUE on orgs.slug). Surface a 409.
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "Slug already in use. Pick a different slug." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "List organizations",
          "description": "List organizations the caller is a member of, with their role."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const orgs = await listOrgsForUser(userId);
      return reply.code(200).send({ orgs });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "Get organization",
          "description": "Get organization details by ID."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const org = await getOrgIfMember(id, userId);
      if (!org) return reply.code(404).send({ error: "Org not found" });
      return reply.code(200).send(org);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id] get error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.patch("/v1/orgs/:id",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "Update organization",
          "description": "Update organization name, slug, or white-label settings."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const role = await getRoleInOrg(id, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = UpdateOrgRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const updated = await updateOrg(id, parsed.data);
      if (!updated) return reply.code(404).send({ error: "Org not found" });
      trackEvent("api.org.updated", userId, { orgId: id });
      return reply.code(200).send(updated);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id] update error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "Slug already in use. Pick a different slug." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/members",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "List members",
          "description": "List all members of an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const role = await getRoleInOrg(id, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const members = await listMembers(id);
      return reply.code(200).send({ members });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/members] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.post("/v1/orgs/:id/members",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "Add member",
          "description": "Add an existing user to the organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id } = request.params as { id: string };
      const role = await getRoleInOrg(id, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = AddMemberRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      // Levers AR-199: admin can add admin/member but NOT owner. Granting
      // ownership is the chain-of-authority move that stays owner-only.
      const targetRole = parsed.data.role ?? "member";
      if (targetRole === "owner" && !hasAtLeastRole(role, "owner")) {
        return reply.code(403).send({
          error: "Only an owner can grant the owner role.",
          code: "cannot_grant_owner",
        });
      }
      await addMember({
        orgId: id,
        userId: parsed.data.user_id,
        role: targetRole,
      });
      trackEvent("api.org.member_added", userId, { orgId: id, addedUserId: parsed.data.user_id });
      return reply.code(201).send({ ok: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/members] add error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // AR-273: change a member's role. RBAC + role-elevation rules mirror
  // POST /v1/orgs/:id/members:
  //   - admin or owner can call
  //   - granting 'owner' is owner-only
  //   - downgrading the last owner is refused (would orphan the org)
  app.patch("/v1/orgs/:id/members/:userId",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "Update member role",
          "description": "Change a member's role in the organization."
      },
    }, async (request, reply) => {
    try {
      const callerId = await authenticateEither(request, reply);
      if (!callerId) return reply;
      const { id: orgId, userId: targetId } = request.params as { id: string; userId: string };
      const callerRole = await getRoleInOrg(orgId, callerId);
      if (!callerRole) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(callerRole, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = UpdateMemberRoleRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const targetRole = parsed.data.role;
      if (targetRole === "owner" && !hasAtLeastRole(callerRole, "owner")) {
        return reply.code(403).send({
          error: "Only an owner can grant the owner role.",
          code: "cannot_grant_owner",
        });
      }
      const currentRole = await getRoleInOrg(orgId, targetId);
      if (!currentRole) return reply.code(404).send({ error: "Member not found in org" });
      // Chain-of-authority: modifying an owner-role member is owner-only,
      // mirroring the DELETE endpoint's cannot_remove_owner_as_admin gate.
      // Applies unconditionally on currentRole === "owner" — without this,
      // an admin in a 2+ owner org could demote any owner to member and
      // take effective control.
      if (currentRole === "owner" && !hasAtLeastRole(callerRole, "owner")) {
        return reply.code(403).send({
          error: "Only an owner can modify an owner.",
          code: "cannot_modify_owner_as_admin",
        });
      }
      // Last-owner protection: refuse to demote the only remaining owner.
      if (currentRole === "owner" && targetRole !== "owner") {
        const owners = await countOwners(orgId);
        if (owners <= 1) {
          return reply.code(409).send({
            error: "Cannot demote the last owner of the org.",
            code: "last_owner",
          });
        }
      }
      const ok = await changeMemberRole(orgId, targetId, targetRole);
      if (!ok) return reply.code(404).send({ error: "Member not found in org" });
      trackEvent("api.org.member_role_changed", callerId, {
        orgId,
        targetUserId: targetId,
        from: currentRole,
        to: targetRole,
      });
      return reply.code(200).send({ ok: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/members/:userId] patch error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/orgs/:id/members/:userId",
    {
    schema: {
          "tags": [
              "Orgs"
          ],
          "summary": "Remove member",
          "description": "Remove a member from the organization."
      },
    }, async (request, reply) => {
    try {
      const callerId = await authenticateEither(request, reply);
      if (!callerId) return reply;
      const { id, userId: targetId } = request.params as { id: string; userId: string };
      const callerRole = await getRoleInOrg(id, callerId);
      if (!callerRole) return reply.code(404).send({ error: "Org not found" });
      // Levers AR-199 RBAC:
      //   self-removal                    -> any role (still bounded by last-owner guard below)
      //   removing a non-owner member     -> admin+
      //   removing an owner-role member   -> owner-only (chain-of-authority)
      const isSelfRemoval = callerId === targetId;
      const targetRole = await getRoleInOrg(id, targetId);
      if (!isSelfRemoval) {
        if (!hasAtLeastRole(callerRole, "admin")) {
          return reply.code(403).send({
            error: "Admin or owner required (unless removing yourself).",
            code: "admin_required",
          });
        }
        if (targetRole === "owner" && !hasAtLeastRole(callerRole, "owner")) {
          return reply.code(403).send({
            error: "Only an owner can remove an owner.",
            code: "cannot_remove_owner_as_admin",
          });
        }
      }
      // Last-owner guard: never let the org be orphaned. Applies to
      // self-removal too — an owner removing themselves can't leave
      // the org without an owner.
      if (targetRole === "owner") {
        const owners = await countOwners(id);
        if (owners <= 1) {
          return reply.code(409).send({
            error: "Cannot remove the last owner. Promote another member to owner first.",
          });
        }
      }
      const ok = await removeMember(id, targetId);
      if (!ok) return reply.code(404).send({ error: "Member not found in org" });
      trackEvent("api.org.member_removed", callerId, { orgId: id, removedUserId: targetId });
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/members/:userId] delete error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── AR-272 (Phase 3 / Levers UI backend): org invitations ──
  //
  // POST /v1/orgs/:id/invitations         create + email (admin+)
  // GET  /v1/orgs/:id/invitations         list pending (member+)
  // DELETE /v1/orgs/:id/invitations/:iid  revoke pending (admin+)
  // POST /v1/invitations/:token/accept    accept (signed-in caller)
  //
  // Tokens are hashed at rest (SHA-256); plaintext lives only in the
  // outbound email. 7-day expiry, single-use. Owner role cannot be
  // granted via invite — Zod's InvitationRoleSchema enforces it.

  app.post("/v1/orgs/:id/invitations",
    {
    schema: {
          "tags": [
              "Invitations"
          ],
          "summary": "Create invitation",
          "description": "Create an invitation to join the organization."
      },
    }, async (request, reply) => {
    try {
      const callerId = await authenticateEither(request, reply);
      if (!callerId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, callerId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = CreateInvitationRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const result = await createInvitation({
        orgId,
        invitedByUserId: callerId,
        email: parsed.data.email,
        role: parsed.data.role,
      });
      if (!result.ok) {
        // 409 covers both "already pending" and "already a member" — same
        // resolution from the caller's perspective: the invite isn't needed.
        return reply.code(409).send({ error: result.error.code, code: result.error.code });
      }
      trackEvent("api.org.invitation_created", callerId, {
        orgId,
        invitationId: result.invitation.id,
        role: result.invitation.role,
      });
      return reply.code(201).send({ invitation: result.invitation });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/invitations] create error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/invitations",
    {
    schema: {
          "tags": [
              "Invitations"
          ],
          "summary": "List invitations",
          "description": "List pending invitations for the organization."
      },
    }, async (request, reply) => {
    try {
      const callerId = await authenticateEither(request, reply);
      if (!callerId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, callerId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const invitations = await listPendingInvitations(orgId);
      return reply.code(200).send({ invitations });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/invitations] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/orgs/:id/invitations/:invitationId",
    {
    schema: {
          "tags": [
              "Invitations"
          ],
          "summary": "Revoke invitation",
          "description": "Revoke a pending invitation."
      },
    }, async (request, reply) => {
    try {
      const callerId = await authenticateEither(request, reply);
      if (!callerId) return reply;
      const { id: orgId, invitationId } = request.params as { id: string; invitationId: string };
      const role = await getRoleInOrg(orgId, callerId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const ok = await revokeInvitation(invitationId, orgId);
      if (!ok) return reply.code(404).send({ error: "Invitation not found or already resolved" });
      trackEvent("api.org.invitation_revoked", callerId, { orgId, invitationId });
      return reply.code(200).send({ revoked: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/invitations/:invitationId] delete error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.post("/v1/invitations/:token/accept",
    {
    schema: {
          "tags": [
              "Invitations"
          ],
          "summary": "Accept invitation",
          "description": "Accept an organization invitation by token."
      },
    }, async (request, reply) => {
    try {
      const callerId = await authenticateEither(request, reply);
      if (!callerId) return reply;
      const callerEmail = await getUserEmail(callerId);
      if (!callerEmail) return reply.code(403).send({ error: "Caller email not available." });
      const { token } = request.params as { token: string };
      const result = await acceptInvitation({
        plaintextToken: token,
        userId: callerId,
        userEmail: callerEmail,
      });
      if (!result.ok) {
        // 410 Gone for expired/revoked/already-accepted (the resource
        // existed but is no longer usable). 403 for email_mismatch (the
        // caller is authenticated, just not the right person). 404 for
        // not_found (no such token).
        const status =
          result.error.code === "invitation_not_found" ? 404 :
          result.error.code === "email_mismatch" ? 403 :
          410;
        return reply.code(status).send({ error: result.error.code, code: result.error.code });
      }
      trackEvent("api.org.invitation_accepted", callerId, {
        orgId: result.org_id,
        role: result.role,
      });
      // Re-fetch org for the response body so the dashboard knows where
      // to route the user. The accept just made callerId a member, so
      // getOrgIfMember will resolve.
      const orgRow = await getOrgIfMember(result.org_id, callerId);
      if (!orgRow) {
        // Vanishingly rare — invitation pointed at an org that's since
        // been deleted. Acceptance succeeded; just return the ids.
        return reply.code(200).send({
          org_id: result.org_id,
          org_slug: "",
          org_name: "",
          role: result.role,
        });
      }
      return reply.code(200).send({
        org_id: orgRow.id,
        org_slug: orgRow.slug,
        org_name: orgRow.display_name ?? orgRow.name,
        role: result.role,
      });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/invitations/:token/accept] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Levers (AR-195): custom signal bundles ──
  //
  // A bundle is a named per-org whitelist of signal keys. Callers opt-in
  // to the whitelist by passing `?bundle=<id>` on /v1/area / /v1/areas
  // /v1/query — absent the param, behaviour is unchanged. Owner-only
  // mutations; reads require membership. See ADR 0029.

  app.post("/v1/orgs/:id/bundles",
    {
    schema: {
          "tags": [
              "Bundles"
          ],
          "summary": "Create bundle",
          "description": "Create a signal bundle for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = CreateBundleRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const unknown = findUnknownSignalKeys(parsed.data.signal_keys);
      if (unknown.length > 0) {
        return reply.code(400).send({
          error: `Unknown signal keys: ${unknown.join(", ")}. See /docs/api-reference for the active taxonomy.`,
          code: "unknown_signal_keys",
        });
      }
      const bundle = await createBundle({
        orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        signalKeys: parsed.data.signal_keys,
      });
      trackEvent("api.bundle.created", userId, { orgId, bundleId: bundle.id, count: bundle.signal_keys.length });
      return reply.code(201).send(bundle);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/bundles] create error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "A bundle with that slug already exists in this org." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/bundles",
    {
    schema: {
          "tags": [
              "Bundles"
          ],
          "summary": "List bundles",
          "description": "List signal bundles for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const bundles = await listBundles(orgId);
      /* AR-311: include org_id + caller_role so the dashboard client can
         gate the Create button + show the slug-derived save target. */
      return reply.code(200).send({ bundles, org_id: orgId, caller_role: role });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/bundles] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/bundles/:bundleId",
    {
    schema: {
          "tags": [
              "Bundles"
          ],
          "summary": "Get bundle",
          "description": "Get a signal bundle by ID."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, bundleId } = request.params as { id: string; bundleId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const bundle = await getBundle(orgId, bundleId);
      if (!bundle) return reply.code(404).send({ error: "Bundle not found" });
      return reply.code(200).send(bundle);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/bundles/:bundleId] get error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.patch("/v1/orgs/:id/bundles/:bundleId",
    {
    schema: {
          "tags": [
              "Bundles"
          ],
          "summary": "Update bundle",
          "description": "Update a signal bundle's name or signal keys."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, bundleId } = request.params as { id: string; bundleId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = UpdateBundleRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      if (parsed.data.signal_keys) {
        const unknown = findUnknownSignalKeys(parsed.data.signal_keys);
        if (unknown.length > 0) {
          return reply.code(400).send({
            error: `Unknown signal keys: ${unknown.join(", ")}.`,
            code: "unknown_signal_keys",
          });
        }
      }
      const updated = await updateBundle(orgId, bundleId, {
        name: parsed.data.name,
        slug: parsed.data.slug,
        signalKeys: parsed.data.signal_keys,
      });
      if (!updated) return reply.code(404).send({ error: "Bundle not found" });
      trackEvent("api.bundle.updated", userId, { orgId, bundleId });
      return reply.code(200).send(updated);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/bundles/:bundleId] update error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "A bundle with that slug already exists in this org." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/orgs/:id/bundles/:bundleId",
    {
    schema: {
          "tags": [
              "Bundles"
          ],
          "summary": "Delete bundle",
          "description": "Delete a signal bundle."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, bundleId } = request.params as { id: string; bundleId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const ok = await deleteBundle(orgId, bundleId);
      if (!ok) return reply.code(404).send({ error: "Bundle not found" });
      trackEvent("api.bundle.deleted", userId, { orgId, bundleId });
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/bundles/:bundleId] delete error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Levers (AR-196): custom scoring presets ──
  //
  // A preset is a per-org saved {base_preset, weights} bundle. Callers
  // reference it on POST /v1/score via `preset_id`. The deterministic
  // engine is reused untouched — Levers config sits on top.
  // Owner-only mutations; reads require membership. See ADR 0030.

  app.post("/v1/orgs/:id/presets",
    {
    schema: {
          "tags": [
              "Presets"
          ],
          "summary": "Create preset",
          "description": "Create a scoring preset for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = CreatePresetRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const unknown = findUnknownWeightKeys(parsed.data.base_preset, parsed.data.weights);
      if (unknown.length > 0) {
        return reply.code(400).send({
          error: `Unknown dimension keys for base_preset '${parsed.data.base_preset}': ${unknown.join(", ")}.`,
          code: "unknown_weight_keys",
        });
      }
      const preset = await createPreset({
        orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        basePreset: parsed.data.base_preset,
        weights: parsed.data.weights,
      });
      trackEvent("api.preset.created", userId, { orgId, presetId: preset.id, basePreset: preset.base_preset });
      return reply.code(201).send(preset);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/presets] create error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "A preset with that slug already exists in this org." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/presets",
    {
    schema: {
          "tags": [
              "Presets"
          ],
          "summary": "List presets",
          "description": "List scoring presets for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const presets = await listPresets(orgId);
      /* AR-311: include org_id + caller_role for client gating. */
      return reply.code(200).send({ presets, org_id: orgId, caller_role: role });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/presets] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/presets/:presetId",
    {
    schema: {
          "tags": [
              "Presets"
          ],
          "summary": "Get preset",
          "description": "Get a scoring preset by ID."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, presetId } = request.params as { id: string; presetId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const preset = await getPreset(orgId, presetId);
      if (!preset) return reply.code(404).send({ error: "Preset not found" });
      return reply.code(200).send(preset);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/presets/:presetId] get error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.patch("/v1/orgs/:id/presets/:presetId",
    {
    schema: {
          "tags": [
              "Presets"
          ],
          "summary": "Update preset",
          "description": "Update a scoring preset's name, base preset, or weights."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, presetId } = request.params as { id: string; presetId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = UpdatePresetRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      // Weights are validated against the EFFECTIVE base_preset after the
      // patch. If the caller only patches weights, we need the existing
      // base_preset; if they patch base_preset too, we use the new one.
      // Fetch once to resolve the effective values.
      const existing = await getPreset(orgId, presetId);
      if (!existing) return reply.code(404).send({ error: "Preset not found" });
      const effectiveBase = parsed.data.base_preset ?? existing.base_preset;
      const effectiveWeights = parsed.data.weights ?? existing.weights;
      const unknown = findUnknownWeightKeys(effectiveBase, effectiveWeights);
      if (unknown.length > 0) {
        return reply.code(400).send({
          error: `Unknown dimension keys for base_preset '${effectiveBase}': ${unknown.join(", ")}.`,
          code: "unknown_weight_keys",
        });
      }
      const updated = await updatePreset(orgId, presetId, {
        name: parsed.data.name,
        slug: parsed.data.slug,
        basePreset: parsed.data.base_preset,
        weights: parsed.data.weights,
      });
      if (!updated) return reply.code(404).send({ error: "Preset not found" });
      trackEvent("api.preset.updated", userId, { orgId, presetId });
      return reply.code(200).send(updated);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/presets/:presetId] update error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "A preset with that slug already exists in this org." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/orgs/:id/presets/:presetId",
    {
    schema: {
          "tags": [
              "Presets"
          ],
          "summary": "Delete preset",
          "description": "Delete a scoring preset."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, presetId } = request.params as { id: string; presetId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const ok = await deletePreset(orgId, presetId);
      if (!ok) return reply.code(404).send({ error: "Preset not found" });
      trackEvent("api.preset.deleted", userId, { orgId, presetId });
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/presets/:presetId] delete error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Levers (AR-197): methodology pinning ──
  //
  // One row per org. When set, the org's pin is applied as the
  // effective engine_version on responses for any of the org's keys
  // (unless they explicitly send X-Engine-Version per request, which
  // still wins). Validated at WRITE time against
  // SUPPORTED_ENGINE_VERSIONS so reads never see an invalid pin.
  // See ADR 0031.

  app.get("/v1/orgs/:id/methodology",
    {
    schema: {
          "tags": [
              "Methodology"
          ],
          "summary": "Get methodology pin",
          "description": "Get the engine version pin for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const pin = await getMethodologyPin(orgId);
      return reply.code(200).send({ engine_version: pin, pinned: pin !== null });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/methodology] get error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.put("/v1/orgs/:id/methodology",
    {
    schema: {
          "tags": [
              "Methodology"
          ],
          "summary": "Set methodology pin",
          "description": "Pin a specific engine version for the organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      // Methodology pin is owner-only — compliance / audit anchor.
      if (!hasAtLeastRole(role, "owner")) {
        return reply.code(403).send({ error: "Owner-only operation.", code: "owner_required" });
      }
      const parsed = SetMethodologyPinRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const supported = getSupportedEngineVersions();
      if (!supported.includes(parsed.data.engine_version)) {
        return reply.code(400).send({
          error: `Unsupported engine_version "${parsed.data.engine_version}". Supported: ${supported.join(", ")}.`,
          code: "unsupported_engine_version",
          supported_versions: supported,
        });
      }
      await setMethodologyPin(orgId, parsed.data.engine_version);
      trackEvent("api.methodology.pinned", userId, { orgId, engineVersion: parsed.data.engine_version });
      return reply.code(200).send({ engine_version: parsed.data.engine_version, pinned: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/methodology] set error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Levers (AR-198): per-org peer cohorts ──
  //
  // A cohort is a named subset of LSOA codes. /v1/peers consumes it as
  // a candidate filter on the existing global k-NN peer graph. Owner-
  // only mutations; reads require membership. See ADR 0032.

  app.post("/v1/orgs/:id/cohorts",
    {
    schema: {
          "tags": [
              "Cohorts"
          ],
          "summary": "Create cohort",
          "description": "Create an area cohort for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = CreateCohortRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const cohort = await createCohort({
        orgId,
        name: parsed.data.name,
        slug: parsed.data.slug,
        geoCodes: parsed.data.geo_codes,
      });
      trackEvent("api.cohort.created", userId, { orgId, cohortId: cohort.id, size: cohort.geo_codes.length });
      return reply.code(201).send(cohort);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/cohorts] create error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "A cohort with that slug already exists in this org." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/cohorts",
    {
    schema: {
          "tags": [
              "Cohorts"
          ],
          "summary": "List cohorts",
          "description": "List area cohorts for an organization."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const cohorts = await listCohorts(orgId);
      /* AR-311: include org_id + caller_role for client gating. */
      return reply.code(200).send({ cohorts, org_id: orgId, caller_role: role });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/cohorts] list error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.get("/v1/orgs/:id/cohorts/:cohortId",
    {
    schema: {
          "tags": [
              "Cohorts"
          ],
          "summary": "Get cohort",
          "description": "Get an area cohort by ID."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, cohortId } = request.params as { id: string; cohortId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      const cohort = await getCohort(orgId, cohortId);
      if (!cohort) return reply.code(404).send({ error: "Cohort not found" });
      return reply.code(200).send(cohort);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/cohorts/:cohortId] get error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.patch("/v1/orgs/:id/cohorts/:cohortId",
    {
    schema: {
          "tags": [
              "Cohorts"
          ],
          "summary": "Update cohort",
          "description": "Update an area cohort."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, cohortId } = request.params as { id: string; cohortId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const parsed = UpdateCohortRequestSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
      }
      const updated = await updateCohort(orgId, cohortId, {
        name: parsed.data.name,
        slug: parsed.data.slug,
        geoCodes: parsed.data.geo_codes,
      });
      if (!updated) return reply.code(404).send({ error: "Cohort not found" });
      trackEvent("api.cohort.updated", userId, { orgId, cohortId });
      return reply.code(200).send(updated);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/cohorts/:cohortId] update error:", error);
      const msg = error instanceof Error ? error.message : "";
      if (/duplicate key|unique constraint/i.test(msg)) {
        return reply.code(409).send({ error: "A cohort with that slug already exists in this org." });
      }
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/orgs/:id/cohorts/:cohortId",
    {
    schema: {
          "tags": [
              "Cohorts"
          ],
          "summary": "Delete cohort",
          "description": "Delete an area cohort."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId, cohortId } = request.params as { id: string; cohortId: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      if (!hasAtLeastRole(role, "admin")) {
        return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
      }
      const ok = await deleteCohort(orgId, cohortId);
      if (!ok) return reply.code(404).send({ error: "Cohort not found" });
      trackEvent("api.cohort.deleted", userId, { orgId, cohortId });
      return reply.code(200).send({ deleted: true });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/cohorts/:cohortId] delete error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  app.delete("/v1/orgs/:id/methodology",
    {
    schema: {
          "tags": [
              "Methodology"
          ],
          "summary": "Clear methodology pin",
          "description": "Remove the engine version pin (revert to latest)."
      },
    }, async (request, reply) => {
    try {
      const userId = await authenticateEither(request, reply);
      if (!userId) return reply;
      const { id: orgId } = request.params as { id: string };
      const role = await getRoleInOrg(orgId, userId);
      if (!role) return reply.code(404).send({ error: "Org not found" });
      // Methodology pin is owner-only — compliance / audit anchor.
      if (!hasAtLeastRole(role, "owner")) {
        return reply.code(403).send({ error: "Owner-only operation.", code: "owner_required" });
      }
      const removed = await clearMethodologyPin(orgId);
      if (removed) {
        trackEvent("api.methodology.unpinned", userId, { orgId });
      }
      return reply.code(200).send({ engine_version: null, pinned: false });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/orgs/:id/methodology] clear error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Intelligence v1: POST /v1/query — the typed query plane (AR-182) ──
  // Programmatic mode ({plan}) skips the LLM entirely; NL mode ({question})
  // routes through the planner -> Zod-validated plan -> SAME deterministic
  // executor. Response always echoes the executed plan + plan_source so
  // consumers can audit + replay. NOT narrative — see ADR 0017.
  app.post("/v1/query",
    {
    schema: {
          "tags": [
              "Intelligence"
          ],
          "summary": "Query intelligence",
          "description": "Run a query plan or natural-language question against the intelligence moat. Supports rank_areas, get_area, score_area, compare_areas, find_peers, find_insights, and find_forecast.",
          "body": { "type": "object", "properties": { "question": { "type": "string" } }, "example": { "question": "best areas for families in London" } }
      },
    }, async (request, reply) => {
    try {
      if (!getConfig().signalsApiEnabled) {
        return reply.code(404).send({ error: "Not found" });
      }
      const ctx = await requireApiAccessWithOrg(request, reply);
      if (!ctx) return reply;
      const parsed = parseQueryRequest(request.body);
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

      // Levers (AR-195): if ?bundle= or body.bundle is set, resolve the
      // bundle's whitelist for the caller's org. The plan is then
      // gated AFTER planning — the executed plan (whether programmatic
      // or NL-derived) must only reference signals in the bundle.
      const rawQuery = (request.query ?? {}) as { bundle?: unknown };
      const rawBody = (request.body ?? {}) as { bundle?: unknown };
      const bundleId =
        typeof rawQuery.bundle === "string" ? rawQuery.bundle :
        typeof rawBody.bundle === "string" ? rawBody.bundle : undefined;
      const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
      if (!resolved.ok) return reply;

      let result: Awaited<ReturnType<typeof runQuery>>;
      try {
        result = await runQuery(parsed.req);
      } catch (err) {
        // AR-267: typed surface for ambiguous place names. Don't 500 —
        // tell the caller which candidates to disambiguate between.
        if (err instanceof AmbiguousLocationError) {
          return reply.code(422).send({
            error: `Place name "${err.query}" is ambiguous. Choose a specific candidate or re-ask with a postcode.`,
            code: "ambiguous_location",
            candidates: err.candidates,
          });
        }
        throw err;
      }
      if (!result.ok) {
        return reply.code(422).send({ error: result.error.message, code: result.error.code, raw: result.error.raw });
      }
      if (resolved.allowed) {
        const outside = planSignalsOutsideBundle(result.response.plan, resolved.allowed);
        if (outside.length > 0) {
          return reply.code(422).send({
            error: `Plan references signals not in bundle: ${outside.join(", ")}.`,
            code: "bundle_signal_not_allowed",
            plan: result.response.plan,
          });
        }
      }
      trackEvent("api.query.executed", ctx.userId, {
        op: result.response.plan.op,
        plan_source: result.response.plan_source,
        bundle: bundleId ?? null,
      });
      reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId));
      return reply.code(200).send(result.response);
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/query] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Intelligence Increment 6: POST /v1/peers — k-NN over normalized signals ──
  // "Areas like this one." Target is identified by exactly one of geo_code |
  // postcode | area (postcode/area resolved through the geo spine). Default
  // signals = all the target has normalized; default k=20 (max 200); default
  // min_signals=3. Distance = SQRT(AVG((t_i - c_i)^2)) over dims BOTH have.
  // See ADR 0023.
  app.post("/v1/peers",
    {
    schema: {
          "tags": [
              "Intelligence"
          ],
          "summary": "Find peers",
          "description": "Find k-nearest-neighbour peers for an area by normalized signal values.",
          "body": { "type": "object", "properties": { "area": { "type": "string" }, "k": { "type": "number" } }, "example": { "area": "SW1A 1AA", "k": 10 } }
      },
    }, async (request, reply) => {
    try {
      if (!getConfig().signalsApiEnabled) {
        return reply.code(404).send({ error: "Not found" });
      }
      const ctx = await requireApiAccessWithOrg(request, reply);
      if (!ctx) return reply;

      const body = (request.body ?? {}) as Record<string, unknown>;
      const target = body.target as { geo_code?: string; postcode?: string; area?: string } | undefined;
      if (!target || typeof target !== "object") {
        return reply.code(400).send({ error: "Missing 'target' — provide one of {geo_code} | {postcode} | {area}." });
      }
      const present = ["geo_code", "postcode", "area"].filter((k) => typeof target[k as keyof typeof target] === "string" && (target[k as keyof typeof target] as string).trim().length > 0);
      if (present.length !== 1) {
        return reply.code(400).send({ error: "target must contain EXACTLY one of {geo_code, postcode, area}." });
      }

      let targetGeoCode: string;
      let scopeLabel: string;
      if (target.geo_code) {
        targetGeoCode = target.geo_code.trim();
        scopeLabel = `geo_code=${targetGeoCode}`;
      } else {
        const q = (target.postcode ?? target.area)!.trim();
        const geo = await geocodeArea(q);
        if (!geo) return reply.code(404).send({ error: `Could not resolve "${q}" to an LSOA.` });
        targetGeoCode = geo.lsoa;
        scopeLabel = `${target.postcode ? "postcode" : "area"}=${q} -> lsoa=${targetGeoCode}`;
      }

      // Levers (AR-198): cohort_id resolution. When set, the cohort's
      // geo_codes scope the candidate set inside buildPeersSql. Default
      // is unchanged (global graph).
      let cohortGeoCodes: string[] | undefined;
      if (typeof body.cohort_id === "string" && body.cohort_id.trim().length > 0) {
        let effectiveOrgId = ctx.orgId;
        if (!effectiveOrgId) {
          const fallback = rows<{ org_id: string }>(await sql`
            SELECT org_id FROM org_members WHERE user_id = ${ctx.userId} AND role = 'owner'
             ORDER BY joined_at ASC LIMIT 1
          `);
          effectiveOrgId = fallback.length > 0 ? fallback[0].org_id : null;
        }
        if (!effectiveOrgId) {
          return reply.code(422).send({
            error: "Cannot resolve cohort_id: caller has no resolvable org context.",
            code: "no_org_context",
          });
        }
        const cohort = await getCohort(effectiveOrgId, body.cohort_id.trim());
        if (!cohort) return reply.code(404).send({ error: "Cohort not found in your org." });
        cohortGeoCodes = cohort.geo_codes;
        scopeLabel = `${scopeLabel} cohort=${cohort.slug} (n=${cohort.geo_codes.length})`;
      }

      const parsed = parsePeersInput({
        targetGeoCode,
        signals: Array.isArray(body.signals) ? (body.signals as unknown[]).map(String) : undefined,
        country: typeof body.country === "string" ? body.country : undefined,
        lad: typeof body.lad === "string" ? body.lad : undefined,
        cohortGeoCodes,
        k: typeof body.k === "number" ? body.k : undefined,
        minSignals: typeof body.min_signals === "number" ? body.min_signals : undefined,
      });
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

      const result = await findPeers(parsed.input);
      if (result.signalsUsed.length === 0) {
        return reply.code(404).send({
          error: `Target ${targetGeoCode} has no normalized signal values yet; cannot compute peers.`,
        });
      }

      trackEvent("api.peers.queried", ctx.userId, {
        target: targetGeoCode,
        signals_count: result.signalsUsed.length,
        peers_returned: result.peers.length,
        k: parsed.input.k,
        cohort_id: typeof body.cohort_id === "string" ? body.cohort_id : null,
      });
      reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId));
      return reply.code(200).send({
        target: { geo_code: targetGeoCode, signals_used: result.signalsUsed },
        peers: result.peers,
        meta: { generated_at: new Date().toISOString(), scope: scopeLabel },
      });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/peers] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });
  // PeersCountry referenced indirectly (type import) so the import isn't tree-shaken;
  // PEERS_DEFAULT_K / _MIN_SIGNALS surface for tests + are stable constants.
  void (PEERS_DEFAULT_K + PEERS_DEFAULT_MIN_SIGNALS + INSIGHTS_DEFAULT_K);
  void ({} as PeersCountry);

  // ── Intelligence Increment 7: POST /v1/insights — anomaly screening ──
  // Ranks LSOAs by ABS(peer_relative_z) on a peer-relative-z derived signal
  // (e.g. crime.total_12m_peer_relative_z). Reads signal_values; the
  // expensive peer math runs OFFLINE in refresh:peers + derive:signals.
  // Country/LAD scope + optional min_abs_z threshold. See ADR 0024.
  app.post("/v1/insights",
    {
    schema: {
          "tags": [
              "Intelligence"
          ],
          "summary": "Find insights",
          "description": "Rank areas by anomaly (ABS peer-relative z-score) on a chosen signal.",
          "body": { "type": "object", "properties": { "signal_key": { "type": "string" }, "country": { "type": "string" }, "k": { "type": "number" } }, "example": { "signal_key": "crime.total_12m", "country": "England", "k": 20 } }
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;

      const body = (request.body ?? {}) as Record<string, unknown>;
      const parsed = parseInsightsInput({
        signalKey: typeof body.signal_key === "string" ? body.signal_key : undefined,
        country: typeof body.country === "string" ? body.country : undefined,
        lad: typeof body.lad === "string" ? body.lad : undefined,
        minAbsZ: typeof body.min_abs_z === "number" ? body.min_abs_z : undefined,
        k: typeof body.k === "number" ? body.k : undefined,
      });
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

      const insights = await findInsights(parsed.input);
      trackEvent("api.insights.queried", userId, {
        signal_key: parsed.input.signalKey,
        country: parsed.input.country,
        lad: parsed.input.lad,
        k: parsed.input.k,
        returned: insights.length,
      });
      reply.header("X-Engine-Version", METHODOLOGY_VERSION);
      const scope = [
        parsed.input.country ? `country=${parsed.input.country}` : "",
        parsed.input.lad ? `lad=${parsed.input.lad}` : "",
        parsed.input.minAbsZ ? `min_abs_z=${parsed.input.minAbsZ}` : "",
      ].filter(Boolean).join(" ") || "national";
      return reply.code(200).send({
        signal_key: parsed.input.signalKey,
        insights,
        meta: {
          generated_at: new Date().toISOString(),
          scope,
          threshold: parsed.input.minAbsZ ?? null,
        },
      });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/insights] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ── Intelligence Increment 8: POST /v1/forecast — linear projection ──
  // Time-series projection of ONE signal at ONE LSOA. Linear regression
  // over the trailing window_months; project horizon_months forward.
  // CI = ±2 * residual_stderr (constant-width band — see ADR 0025). The
  // SAME runForecast serves both this endpoint and POST /v1/query's
  // find_forecast plan op.
  void (FORECAST_DEFAULT_WINDOW + FORECAST_DEFAULT_HORIZON); // keep imports alive
  app.post("/v1/forecast",
    {
    schema: {
          "tags": [
              "Intelligence"
          ],
          "summary": "Forecast signal",
          "description": "Project a signal forward in time using linear regression over the trailing window."
      },
    }, async (request, reply) => {
    try {
      const userId = await guardSignals(request, reply);
      if (!userId) return reply;

      const body = (request.body ?? {}) as Record<string, unknown>;
      const target = body.target as { geo_code?: string; postcode?: string; area?: string } | undefined;
      if (!target || typeof target !== "object") {
        return reply.code(400).send({ error: "Missing 'target' — provide one of {geo_code} | {postcode} | {area}." });
      }
      const present = ["geo_code", "postcode", "area"].filter((k) => typeof target[k as keyof typeof target] === "string" && (target[k as keyof typeof target] as string).trim().length > 0);
      if (present.length !== 1) {
        return reply.code(400).send({ error: "target must contain EXACTLY one of {geo_code, postcode, area}." });
      }

      let targetGeoCode: string;
      let scopeLabel: string;
      if (target.geo_code) {
        targetGeoCode = target.geo_code.trim();
        scopeLabel = `geo_code=${targetGeoCode}`;
      } else {
        const q = (target.postcode ?? target.area)!.trim();
        const geo = await geocodeArea(q);
        if (!geo) return reply.code(404).send({ error: `Could not resolve "${q}" to an LSOA.` });
        targetGeoCode = geo.lsoa;
        scopeLabel = `${target.postcode ? "postcode" : "area"}=${q} -> lsoa=${targetGeoCode}`;
      }

      const parsed = parseForecastInput({
        targetGeoCode,
        signalKey: typeof body.signal_key === "string" ? body.signal_key : undefined,
        windowMonths: typeof body.window_months === "number" ? body.window_months : undefined,
        horizonMonths: typeof body.horizon_months === "number" ? body.horizon_months : undefined,
      });
      if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

      const result = await runForecast(parsed.input);
      if (!result) {
        return reply.code(404).send({
          error: `No usable time-series for signal_key=${parsed.input.signalKey} at ${targetGeoCode} in the trailing ${parsed.input.windowMonths} months (need >=2 monthly observations).`,
        });
      }

      trackEvent("api.forecast.queried", userId, {
        target: targetGeoCode,
        signal_key: parsed.input.signalKey,
        window_months: parsed.input.windowMonths,
        horizon_months: parsed.input.horizonMonths,
        n_observations: result.stats.n_observations,
        r2: result.stats.r2,
      });
      reply.header("X-Engine-Version", METHODOLOGY_VERSION);
      return reply.code(200).send({
        target: { geo_code: targetGeoCode },
        signal_key: parsed.input.signalKey,
        points: result.points,
        meta: {
          generated_at: new Date().toISOString(),
          scope: scopeLabel,
          window_months: parsed.input.windowMonths,
          horizon_months: parsed.input.horizonMonths,
          n_observations: result.stats.n_observations,
          r2: result.stats.r2,
          slope_per_month: result.stats.slope,
          intercept: result.stats.intercept,
          residual_stderr: result.residualStderr,
          latest_observed_period: result.stats.latest_observed_period,
        },
      });
    } catch (error) {
      if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      logger.error("[v1/forecast] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // AR-130 bulk scoring: up to BATCH_MAX_ITEMS areas per call, bounded
  // concurrency, per-item result array. Pre-checks total quota (fail fast).
  // Migrated from the legacy /api/v1/batch route.
  app.post("/v1/batch",
    {
    schema: {
          "tags": [
              "Webhooks"
          ],
          "summary": "Batch report",
          "description": "Generate reports for multiple areas in a single request.",
          "body": { "type": "object", "properties": { "items": { "type": "array" } }, "example": { "items": [{ "area": "SW1A 1AA", "intent": "moving" }] } }
      },
    }, async (request, reply) => {
    try {
      const authHeader = headerString(request.headers.authorization);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
      }
      const apiKey = authHeader.slice(7);
      const result = await validateApiKey(apiKey, clientIpOf(request));
      if (!result) return reply.code(401).send({ error: "Invalid or revoked API key" });
      if ("blocked" in result) {
        return reply.code(403).send({
          error: "Request IP is not in the key's allowlist.",
          code: result.blocked,
        });
      }
      const userId = result.userId;

      // Batch-specific rate limit: 5 batches/min per key.
      const rl = await rateLimit(`api-batch:${apiKey}`, {
        max: RATE_LIMITS.apiBatch.max,
        windowSeconds: RATE_LIMITS.apiBatch.windowSeconds,
      });
      reply.headers(rateLimitHeaders(RATE_LIMITS.apiBatch.max, rl));
      if (!rl.success) {
        return reply.code(429).send({ error: "Too many batch requests. Rate limit: 5 batches per minute." });
      }

      if (!(await hasApiAccess(userId))) {
        return reply.code(403).send({ error: "API access not available on your current plan. Upgrade at /pricing." });
      }

      // Resolve engine pin before parsing the (potentially large) items array.
      const engine = resolveEngineVersion(headerString(request.headers["x-engine-version"]));
      if (!engine.ok) {
        return reply.code(engine.statusCode).send({ error: engine.error, code: engine.code, supported_versions: engine.supportedVersions });
      }

      // Validate body shape.
      const body = request.body;
      if (typeof body !== "object" || body === null || !("items" in body)) {
        return reply.code(400).send({ error: "Request body must be { items: [...] }" });
      }
      if (!isBatchItemArray((body as { items: unknown }).items)) {
        return reply.code(400).send({ error: "Each item must be { area: string, intent: string }" });
      }
      const items = (body as { items: BatchItem[] }).items;
      if (items.length === 0) {
        return reply.code(400).send({ error: "items array cannot be empty" });
      }
      if (items.length > BATCH_MAX_ITEMS) {
        return reply.code(400).send({ error: `Batch size ${items.length} exceeds max ${BATCH_MAX_ITEMS}. Split into smaller batches.` });
      }

      // Pre-check whole-batch quota; fail fast to avoid partial consumption.
      const usage = await canGenerateReport(userId);
      if (!usage.allowed) {
        return reply.code(429).send({ error: "Monthly report limit reached", used: usage.used, limit: usage.limit, plan: usage.plan });
      }
      const remaining = usage.limit === Infinity ? Infinity : usage.limit - usage.used;
      if (items.length > remaining) {
        return reply.code(429).send({
          error: `Batch requires ${items.length} reports but you have ${remaining} remaining this period`,
          used: usage.used,
          limit: usage.limit,
          plan: usage.plan,
          batch_size: items.length,
          remaining,
        });
      }

      const idempotencyKey = parseIdempotencyKey(headerString(request.headers["idempotency-key"]));
      const idem = await withIdempotency(
        userId,
        idempotencyKey,
        { items },
        async () => {
          const results = await processBatchItems(items, userId);
          const succeeded = results.filter(isSuccess).length;
          const failed = results.length - succeeded;
          trackEvent("api.batch.processed", userId, { batch_size: items.length, succeeded, failed });
          return { status: 200, body: { results, summary: { total: items.length, succeeded, failed } } };
        },
      );

      reply.header("X-Idempotency-Replayed", String(idem.replayed));
      reply.header("X-Engine-Version", engine.resolvedVersion);
      return reply.code(idem.status).send(idem.body);
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/batch] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // AR-129: register an outbound webhook subscription. Returns the signing
  // secret ONCE (never recoverable). Migrated from the legacy
  // /api/v1/webhooks POST route.
  app.post("/v1/webhooks",
    {
    schema: {
          "tags": [
              "Webhooks"
          ],
          "summary": "Create webhook",
          "description": "Register a webhook endpoint for event notifications.",
          "body": { "type": "object", "properties": { "url": { "type": "string" }, "events": { "type": "array", "items": { "type": "string" } } }, "example": { "url": "https://example.com/hooks", "events": ["report.created"] } }
      },
    }, async (request, reply) => {
    try {
      const userId = await requireApiAccess(request, reply);
      if (!userId) return reply; // gate response already sent

      const body = request.body;
      if (typeof body !== "object" || body === null) {
        return reply.code(400).send({ error: "Request body must be { url, events: [...] }" });
      }
      const { url, events } = body as { url?: unknown; events?: unknown };

      const urlCheck = validateWebhookUrl(url);
      if (!urlCheck.valid) {
        return reply.code(400).send({ error: urlCheck.error });
      }

      const eventList = validateEventTypes(events);
      if (!eventList) {
        return reply.code(400).send({
          error: "events must be a non-empty array of supported types: 'report.created' or 'signal.changed'",
        });
      }

      const created = await createWebhookSubscription(userId, urlCheck.sanitized, eventList);
      return reply.code(201).send(created);
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/webhooks POST] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // AR-129: list the caller's active webhook subscriptions (secret omitted).
  // Migrated from the legacy /api/v1/webhooks GET route.
  app.get("/v1/webhooks",
    {
    schema: {
          "tags": [
              "Webhooks"
          ],
          "summary": "List webhooks",
          "description": "List registered webhooks."
      },
    }, async (request, reply) => {
    try {
      const userId = await requireApiAccess(request, reply);
      if (!userId) return reply; // gate response already sent

      const subscriptions = await listWebhookSubscriptions(userId);
      return reply.send({ subscriptions });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/webhooks GET] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // AR-129: revoke a webhook subscription by id. 404 if it does not belong to
  // the caller or was already revoked. Migrated from the legacy
  // /api/v1/webhooks/[id] DELETE route.
  app.delete<{ Params: { id: string } }>("/v1/webhooks/:id", {
    schema: { tags: ["Webhooks"], summary: "Delete webhook", description: "Delete a registered webhook." },
  }, async (request, reply) => {
    try {
      const userId = await requireApiAccess(request, reply);
      if (!userId) return reply; // gate response already sent

      const { id } = request.params;
      const revoked = await revokeWebhookSubscription(userId, id);
      if (!revoked) {
        return reply.code(404).send({ error: "Webhook subscription not found or already revoked" });
      }
      return reply.send({ id, status: "revoked" });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/webhooks/:id DELETE] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // AR-283: rotate the signing secret on an active subscription. The
  // plaintext secret comes back ONCE in the response (the dashboard
  // surfaces it in the same one-time-reveal panel as create). 404 if
  // the subscription doesn't belong to the caller or was revoked.
  app.post<{ Params: { id: string } }>("/v1/webhooks/:id/rotate-secret", {
    schema: { tags: ["Webhooks"], summary: "Rotate webhook secret", description: "Rotate the signing secret for a webhook." },
  }, async (request, reply) => {
    try {
      const userId = await requireApiAccess(request, reply);
      if (!userId) return reply;

      const { id } = request.params;
      const newSecret = await rotateWebhookSecret(userId, id);
      if (!newSecret) {
        return reply.code(404).send({ error: "Webhook subscription not found or already revoked" });
      }
      return reply.send({ id, secret: newSecret });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("[v1/webhooks/:id/rotate-secret POST] error:", error);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Stripe webhook receiver. Authenticated by HMAC signature (not bearer/session),
  // so it needs no auth gate. The raw body (preserved by the content-type parser
  // above) is required for signature verification. handleStripeWebhook returns
  // the status: 400 = bad signature (no retry), 500 = processing failed (Stripe
  // retries), 200 = received/deduplicated. Migrated from /api/stripe/webhook.
  app.post("/stripe/webhook", async (request, reply) => {
    const result = await handleStripeWebhook(
      request.rawBody ?? "",
      headerString(request.headers["stripe-signature"]),
    );
    return reply.code(result.status).send(result.body);
  });

  // Open the Stripe billing portal for the logged-in user. Session-authed.
  // Migrated from /api/stripe/portal (auth() -> authenticateSession). The
  // return_url points at the frontend (APP_URL), not this API origin.
  app.post("/stripe/portal", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const customerId = await getStripeCustomerId(userId);
      if (!customerId) {
        return reply.code(400).send({ error: "No billing account" });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${APP_URL}/dashboard`,
      });

      return reply.send({ url: portalSession.url });
    } catch (error) {
      logger.error("Portal error:", error);
      return reply.code(500).send({ error: "Failed to create portal" });
    }
  });

  // Schedule cancellation of the user's active subscription at period end (not
  // immediate). Session-authed. Migrated from /api/stripe/cancel.
  app.post("/stripe/cancel", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      // Look up the user's active Stripe subscription.
      const subRows = await sql`
        SELECT stripe_subscription_id, plan, current_period_end
        FROM subscriptions
        WHERE user_id = ${userId} AND status = 'active' AND stripe_subscription_id IS NOT NULL
      `;
      if (subRows.length === 0) {
        return reply.code(404).send({ error: "No active subscription found" });
      }

      const sub = row<Pick<SubscriptionRow, "stripe_subscription_id" | "plan">>(subRows[0]);
      const subscriptionId = sub.stripe_subscription_id;
      const plan = sub.plan;

      // Already scheduled to cancel? Report the existing date.
      const currentSub = asSubscription(await stripe.subscriptions.retrieve(subscriptionId));
      if (currentSub.cancel_at_period_end) {
        return reply.code(409).send({
          error: "Subscription is already scheduled for cancellation",
          cancel_at: new Date(currentSub.current_period_end * 1000).toISOString(),
        });
      }

      const updatedSub = asSubscription(
        await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true }),
      );
      const cancelAt = new Date(updatedSub.current_period_end * 1000).toISOString();

      trackEvent("plan.cancel_scheduled", userId, { plan, cancel_at: cancelAt });

      return reply.send({
        success: true,
        cancel_at: cancelAt,
        message: "Subscription will be cancelled at the end of the billing period",
      });
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("Cancel subscription error:", error);
      return reply.code(500).send({ error: "Failed to cancel subscription" });
    }
  });

  // Start (or swap) a plan subscription via Stripe Checkout. Session-authed.
  // Migrated from /api/stripe/checkout. An existing active sub is swapped in
  // place (proration); otherwise a new customer + checkout session is created.
  // success/cancel URLs point at the frontend (APP_URL).
  app.post("/stripe/checkout", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const { plan } = (request.body ?? {}) as { plan?: unknown };
      // Accept v2 paid plans (new commercial offering) + v1 legacy paid plans
      // (so a grandfathered customer can still move between v1 tiers). Sandbox is
      // free (no checkout); Enterprise is contact-only (not self-serve here).
      const v1LegacyPaid = ["starter", "pro", "developer", "business", "growth"];
      const v2SelfServePaid = V2_PAID_PLANS.filter((p) => p !== "enterprise");
      const allowedPlans: string[] = [...v1LegacyPaid, ...v2SelfServePaid];
      if (typeof plan !== "string" || !allowedPlans.includes(plan)) {
        return reply.code(400).send({ error: "Invalid plan" });
      }

      const planConfig = PLANS[plan as PlanId];
      if (!planConfig.priceId) {
        return reply.code(400).send({ error: "Plan not configured. Please contact support." });
      }

      // Look up existing subscription record.
      let subRow: Pick<SubscriptionRow, "stripe_customer_id" | "stripe_subscription_id"> | null = null;
      try {
        const subRows = await sql`
          SELECT stripe_customer_id, stripe_subscription_id
          FROM subscriptions WHERE user_id = ${userId}
        `;
        if (subRows.length > 0) {
          subRow = row<Pick<SubscriptionRow, "stripe_customer_id" | "stripe_subscription_id">>(subRows[0]);
        }
      } catch (dbErr) {
        logger.error("Checkout: DB lookup failed for user", userId, dbErr);
        return reply.code(500).send({ error: "Database error. Please try again." });
      }

      let customerId = subRow?.stripe_customer_id || null;
      const existingSubId = subRow?.stripe_subscription_id || null;

      // If the user has an existing Stripe subscription, swap the plan in place.
      if (existingSubId && customerId) {
        try {
          const sub = await stripe.subscriptions.retrieve(existingSubId);
          if (sub.status === "active" || sub.status === "trialing") {
            await stripe.subscriptions.update(existingSubId, {
              items: [{ id: sub.items.data[0].id, price: planConfig.priceId }],
              proration_behavior: "create_prorations",
            });

            await sql`
              UPDATE subscriptions SET
                plan = ${plan},
                updated_at = NOW()
              WHERE user_id = ${userId}
            `;

            trackEvent("plan.changed", userId, { plan });
            return reply.send({ url: `/dashboard?upgraded=true` });
          }
          // Cancelled/past_due: fall through to a fresh checkout.
        } catch (err) {
          // Subscription missing in Stripe (stale test-mode data): fall through.
          logger.warn("Checkout: stale subscription", existingSubId, "- falling through to new checkout:", err);
        }
      }

      // Validate the stored customer still exists in Stripe (test->live drift).
      if (customerId) {
        try {
          const cust = await stripe.customers.retrieve(customerId);
          if (cust.deleted) customerId = null;
        } catch {
          logger.warn("Checkout: stale customer", customerId, "- creating new customer");
          customerId = null;
        }
      }

      // Create a new Stripe customer if needed.
      if (!customerId) {
        try {
          const customer = await stripe.customers.create({
            email: (await getUserEmail(userId)) || undefined,
            metadata: { user_id: userId },
          });
          customerId = customer.id;
        } catch (stripeErr) {
          logger.error("Checkout: Stripe customer creation failed", stripeErr);
          return reply.code(500).send({ error: "Payment service error. Please try again." });
        }

        try {
          await sql`
            INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
            VALUES (${generateId("sub")}, ${userId}, ${customerId}, 'free', 'active')
            ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${customerId}
          `;
        } catch (dbErr) {
          logger.error("Checkout: subscription upsert failed for user", userId, dbErr);
          return reply.code(500).send({ error: "Database error. Please try again." });
        }
      }

      // Create the checkout session for a new subscription.
      let checkoutSession;
      try {
        checkoutSession = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: planConfig.priceId, quantity: 1 }],
          success_url: `${APP_URL}/dashboard?upgraded=true`,
          cancel_url: `${APP_URL}/pricing`,
          metadata: { user_id: userId, plan },
        });
      } catch (stripeErr) {
        logger.error("Checkout: session creation failed for plan", plan, "priceId", planConfig.priceId, stripeErr);
        return reply.code(500).send({ error: "Failed to start checkout. Please try again." });
      }

      trackEvent("plan.upgrade.started", userId, { plan });
      return reply.send({ url: checkoutSession.url });
    } catch (error) {
      logger.error("Checkout: unexpected error:", error);
      return reply.code(500).send({ error: "Something went wrong. Please try again." });
    }
  });

  // Purchase an add-on (e.g. MCP £29/mo) as a separate Stripe subscription so
  // cancellation is isolated. Session-authed. Migrated from
  // /api/stripe/addon-checkout. Idempotent guards: already-owned + plan-includes.
  app.post("/stripe/addon-checkout", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const { addon } = (request.body ?? {}) as { addon?: unknown };
      if (typeof addon !== "string" || !ADDON_KEYS.includes(addon as AddonKey)) {
        return reply.code(400).send({ error: `Invalid addon. Supported: ${ADDON_KEYS.join(", ")}` });
      }
      const addonKey = addon as AddonKey;
      const cfg = ADDONS[addonKey];

      if (!cfg.priceId) {
        logger.error("[addon-checkout] price ID missing for", addonKey);
        return reply.code(500).send({ error: "Add-on not configured. Please contact support." });
      }

      // Guard: already owns the active add-on.
      if (await hasAddon(userId, addonKey)) {
        return reply.send({ url: `/dashboard?addon=${addonKey}&already_owned=1`, already_owned: true });
      }

      // Guard: the plan already grants the entitlement (Growth+ for MCP).
      const plan = await getUserPlan(userId);
      if (addonKey === "mcp" && PLANS[plan as PlanId]?.mcpAccess === true) {
        return reply.send({ url: `/dashboard?addon=${addonKey}&plan_includes=1`, plan_includes: true });
      }

      // Find or create the user's Stripe customer.
      let subRow: Pick<SubscriptionRow, "stripe_customer_id"> | null = null;
      try {
        const subRows = await sql`
          SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId}
        `;
        if (subRows.length > 0) {
          subRow = row<Pick<SubscriptionRow, "stripe_customer_id">>(subRows[0]);
        }
      } catch (dbErr) {
        logger.error("[addon-checkout] DB lookup failed for user", userId, dbErr);
        return reply.code(500).send({ error: "Database error. Please try again." });
      }

      let customerId = subRow?.stripe_customer_id || null;

      if (customerId) {
        try {
          const cust = await stripe.customers.retrieve(customerId);
          if (cust.deleted) customerId = null;
        } catch {
          logger.warn("[addon-checkout] stale customer", customerId, "- creating new");
          customerId = null;
        }
      }

      if (!customerId) {
        try {
          const customer = await stripe.customers.create({
            email: (await getUserEmail(userId)) || undefined,
            metadata: { user_id: userId },
          });
          customerId = customer.id;
        } catch (stripeErr) {
          logger.error("[addon-checkout] Stripe customer creation failed", stripeErr);
          return reply.code(500).send({ error: "Payment service error." });
        }

        try {
          await sql`
            INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
            VALUES (${generateId("sub")}, ${userId}, ${customerId}, 'sandbox', 'active')
            ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${customerId}
          `;
        } catch (dbErr) {
          logger.error("[addon-checkout] subscription upsert failed", dbErr);
          return reply.code(500).send({ error: "Database error." });
        }
      }

      // metadata.addon tells the webhook this is an add-on purchase.
      let checkoutSession;
      try {
        checkoutSession = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: cfg.priceId, quantity: 1 }],
          success_url: `${APP_URL}/dashboard?addon=${addonKey}&purchased=1`,
          cancel_url: `${APP_URL}/dashboard?addon=${addonKey}&cancelled=1`,
          metadata: { user_id: userId, addon: addonKey },
          subscription_data: {
            metadata: { user_id: userId, addon: addonKey },
          },
        });
      } catch (stripeErr) {
        logger.error("[addon-checkout] session creation failed", addonKey, stripeErr);
        return reply.code(500).send({ error: "Failed to start checkout." });
      }

      trackEvent("addon.purchase.started", userId, { addon: addonKey });
      return reply.send({ url: checkoutSession.url });
    } catch (error) {
      logger.error("[addon-checkout] unexpected:", error);
      return reply.code(500).send({ error: "Something went wrong." });
    }
  });

  // The logged-in user's monthly report quota usage (dashboard). Session-authed.
  // Migrated from /api/usage.
  app.get("/usage", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const usage = await canGenerateReport(userId);
      return reply.send(usage);
    } catch (error) {
      logger.error("Usage check error:", error);
      return reply.code(500).send({ error: "Failed to check usage" });
    }
  });

  // Composite dashboard data — plan, usage, MCP status, primary API key,
  // email verification, and latest report call. Session-authed. Combines
  // what /dashboard and /dashboard/billing pages need in one round-trip.
  app.get("/dashboard", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const [
        plan,
        used,
        mcpAccess,
        mcpAddonOwned,
        mcpUsage,
      ] = await Promise.all([
        getUserPlan(userId),
        getMonthlyReportCount(userId),
        hasMcpAccess(userId),
        hasAddon(userId, "mcp"),
        getMcpUsageThisMonth(userId),
      ]);

      const planConfig = PLANS[plan as PlanId];
      const planIncludesMcp = planConfig?.mcpAccess === true;

      // Primary API key (first non-revoked, created first).
      let primaryKey: { key_prefix: string | null; name: string; last_used_at: string | null } | null = null;
      try {
        const keyRows = await sql`
          SELECT key_prefix, name, last_used_at
          FROM api_keys
          WHERE user_id = ${userId} AND revoked = FALSE
          ORDER BY created_at ASC
          LIMIT 1
        `;
        if (keyRows.length > 0) {
          primaryKey = keyRows[0] as { key_prefix: string | null; name: string; last_used_at: string | null };
        }
      } catch {
        // Soft-fail: primary key is nice-to-have.
      }

      // Email verification status.
      let emailVerified = false;
      try {
        const userRows = await sql`SELECT email_verified FROM users WHERE id = ${userId} LIMIT 1`;
        if (userRows.length > 0) {
          emailVerified = (userRows[0] as { email_verified: boolean }).email_verified;
        }
      } catch {
        // Soft-fail: assume verified.
        emailVerified = true;
      }

      // Latest report call (area + score + preset).
      let latestCall: { preset: string; area: string; score: number; created_at: string } | null = null;
      try {
        const reportRows = await sql`
          SELECT intent AS preset, area, score, created_at
          FROM reports
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 1
        `;
        if (reportRows.length > 0) {
          latestCall = reportRows[0] as { preset: string; area: string; score: number; created_at: string };
        }
      } catch {
        // Soft-fail: latest call is nice-to-have.
      }

      return reply.send({
        plan,
        planName: planConfig.name,
        used,
        limit: planConfig.reportsPerMonth,
        mcp: {
          access: mcpAccess,
          addonOwned: mcpAddonOwned,
          includedFreeViaPlan: planIncludesMcp,
          callsThisMonth: mcpUsage,
        },
        emailVerified,
        primaryKey,
        latestCall,
      });
    } catch (error) {
      logger.error("Dashboard data error:", error);
      return reply.code(500).send({ error: "Failed to fetch dashboard data" });
    }
  });

  // The logged-in user's plan + whether a Stripe sub is scheduled to cancel.
  // Session-authed. Migrated from /api/settings/subscription.
  app.get("/settings/subscription", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const plan = await getUserPlan(userId);
      const planConfig = PLANS[plan as PlanId];

      const subRows = await sql`
        SELECT stripe_subscription_id FROM subscriptions
        WHERE user_id = ${userId} AND status = 'active' AND stripe_subscription_id IS NOT NULL
      `;

      let cancelAt: string | null = null;
      const subRecord = subRows.length > 0 ? row<Pick<SubscriptionRow, "stripe_subscription_id">>(subRows[0]) : null;
      const hasStripeSubscription = !!subRecord?.stripe_subscription_id;

      if (hasStripeSubscription && subRecord) {
        try {
          const sub = asSubscription(await stripe.subscriptions.retrieve(subRecord.stripe_subscription_id));
          if (sub.cancel_at_period_end && sub.current_period_end) {
            cancelAt = new Date(sub.current_period_end * 1000).toISOString();
          }
        } catch {
          // Subscription may no longer exist in Stripe; treat as no subscription.
        }
      }

      return reply.send({ plan, planName: planConfig.name, hasStripeSubscription, cancelAt });
    } catch (error) {
      logger.error("Subscription info error:", error);
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      return reply.code(500).send({ error: "Failed to fetch subscription info" });
    }
  });

  // API-key usage dashboard: request totals, a 30-day daily series, and the
  // caller's active keys. Session-authed + requires plan API access. Migrated
  // from /api/keys/usage.
  app.get("/keys/usage", async (request, reply) => {
    const userId = await authenticateSession(request, reply);
    if (!userId) return reply; // 401 already sent

    const apiAllowed = await hasApiAccess(userId);
    if (!apiAllowed) {
      return reply.code(403).send({ error: "API usage dashboard requires a Developer, Business, or Growth plan" });
    }

    const plan = await getUserPlan(userId);

    try {
      /* AR-306: count ALL api.* events (api.report.generated, api.me.read,
         api.score.scored, api.batch.processed, api.query.executed, etc.)
         not just /v1/report. Without this the dashboard chart undercounts
         by a wide margin once a user touches anything but /v1/report.
         Re-applies the AR-287 fix that was lost when web's /api/keys/usage
         BFF became a thin proxy in PR #197 (Plan 010). */
      const [totalRequests, requestsThisMonth, requestsByDay, lastRequest, apiKeys] = await Promise.all([
        sql`
          SELECT COUNT(*)::int as count
          FROM activity_events
          WHERE user_id = ${userId} AND event LIKE 'api.%'
        `,
        sql`
          SELECT COUNT(*)::int as count
          FROM activity_events
          WHERE user_id = ${userId}
            AND event LIKE 'api.%'
            AND created_at >= date_trunc('month', NOW())
        `,
        sql`
          SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
          FROM activity_events
          WHERE user_id = ${userId}
            AND event LIKE 'api.%'
            AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY day
          ORDER BY day
        `,
        sql`
          SELECT created_at
          FROM activity_events
          WHERE user_id = ${userId} AND event LIKE 'api.%'
          ORDER BY created_at DESC
          LIMIT 1
        `,
        sql`
          SELECT
            ak.id,
            ak.key_prefix as key_preview,
            ak.name,
            ak.created_at,
            ak.last_used_at
          FROM api_keys ak
          WHERE ak.user_id = ${userId} AND ak.revoked = FALSE
          ORDER BY ak.created_at DESC
        `,
      ]);

      const totalCount = row<CountRow>(totalRequests[0]);
      const monthCount = row<CountRow>(requestsThisMonth[0]);
      const dailyCounts = rows<DayCountRow>(requestsByDay);
      const lastRow = lastRequest.length > 0 ? row<Pick<ActivityEventRow, "created_at">>(lastRequest[0]) : null;
      const keys = rows<ApiKeyPreview>(apiKeys);

      // Fill in missing days with zero counts for the chart.
      const dayMap = new Map<string, number>();
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayMap.set(key, 0);
      }
      for (const dc of dailyCounts) {
        const key = new Date(dc.day).toISOString().split("T")[0];
        dayMap.set(key, dc.count);
      }

      const dailyData = Array.from(dayMap.entries()).map(([day, count]) => ({ day, count }));

      return reply.send({
        totalRequests: totalCount.count || 0,
        requestsThisMonth: monthCount.count || 0,
        monthlyLimit: PLANS[plan as PlanId]?.reportsPerMonth ?? 100,
        dailyData,
        lastRequestAt: lastRow?.created_at || null,
        keys: keys.map((k) => ({
          id: k.id,
          key_preview: k.key_preview,
          name: k.name,
          created_at: k.created_at,
          last_used_at: k.last_used_at,
        })),
      });
    } catch (error) {
      logger.error("[API Usage] Error:", error);
      return reply.code(500).send({ error: "Failed to fetch usage data" });
    }
  });

  // Fetch one of the caller's own reports by id (browser report view).
  // Session-authed. Migrated from /api/report/[id]. (The POST that GENERATES a
  // browser report is deferred — it depends on the not-yet-migrated email
  // module for report delivery.)
  app.get<{ Params: { id: string } }>("/report/:id", {
    schema: { tags: ["Reports"], summary: "Get report by ID", description: "Retrieve a previously generated report by its ID." },
  }, async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const { id } = request.params;
      const result = await sql`
        SELECT id, area, intent, report, score, created_at
        FROM reports
        WHERE id = ${id} AND user_id = ${userId}
      `;
      if (result.length === 0) {
        return reply.code(404).send({ error: "Report not found" });
      }

      const r = result[0];
      return reply.send({
        id: r.id,
        area: r.area,
        intent: r.intent,
        report: typeof r.report === "string" ? JSON.parse(r.report) : r.report,
        score: r.score,
        created_at: r.created_at,
      });
    } catch (error) {
      logger.error("Report fetch error:", error);
      return reply.code(500).send({ error: "Failed to fetch report" });
    }
  });

  // Delete one of the caller's own reports. Session-authed. Migrated from
  // /api/report/[id].
  app.delete<{ Params: { id: string } }>("/report/:id", {
    schema: { tags: ["Reports"], summary: "Delete report", description: "Delete a previously generated report by its ID." },
  }, async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const { id } = request.params;
      const result = await sql`
        DELETE FROM reports
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING id
      `;
      if (result.length === 0) {
        return reply.code(404).send({ error: "Report not found" });
      }

      return reply.send({ ok: true });
    } catch (error) {
      logger.error("Report delete error:", error);
      return reply.code(500).send({ error: "Failed to delete report" });
    }
  });

  // List the caller's API keys (dashboard). Session-authed. Migrated from
  // /api/keys (the legacy withAuth wrapper == authenticateSession + try/catch).
  app.get("/keys", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent
      const keys = await listApiKeys(userId);
      return reply.send({ keys });
    } catch (error) {
      logger.error("GET /keys failed:", error);
      return reply.code(500).send({ error: "Something went wrong. Please try again." });
    }
  });

  // Create a new API key. Requires plan API access. Session-authed. Migrated
  // from /api/keys. Returns the key once.
  app.post("/keys", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      if (!(await hasApiAccess(userId))) {
        return reply.code(403).send({ error: "API keys are not available on your current plan. Upgrade at /pricing." });
      }

      const name = ((request.body ?? {}) as { name?: string }).name || "Default";
      const key = await createApiKey(userId, name);
      return reply.send({ key });
    } catch (error) {
      logger.error("POST /keys failed:", error);
      return reply.code(500).send({ error: "Something went wrong. Please try again." });
    }
  });

  // Revoke an API key. Session-authed. Migrated from /api/keys/[id].
  app.delete<{ Params: { id: string } }>("/keys/:id", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const revoked = await revokeApiKey(userId, request.params.id);
      if (!revoked) {
        return reply.code(404).send({ error: "Key not found" });
      }
      return reply.send({ success: true });
    } catch (error) {
      logger.error("DELETE /keys/:id failed:", error);
      return reply.code(500).send({ error: "Something went wrong. Please try again." });
    }
  });

  // Permanently delete the caller's account + all their data. Session-authed.
  // Migrated from /api/settings/delete-account. The multi-statement transaction
  // (child tables first, user row last) is copied VERBATIM from the legacy route
  // and runs through the same Neon client.
  app.delete("/settings/delete-account", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      await sql`
        BEGIN;
        DELETE FROM reports WHERE user_id = ${userId};
        DELETE FROM api_keys WHERE user_id = ${userId};
        DELETE FROM activity_events WHERE user_id = ${userId};
        DELETE FROM email_verification_tokens WHERE user_id = ${userId};
        DELETE FROM subscriptions WHERE user_id = ${userId};
        DELETE FROM users WHERE id = ${userId};
        COMMIT;
      `;

      return reply.send({ success: true });
    } catch (error) {
      logger.error("Account deletion error:", error);
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      return reply.code(500).send({ error: "Failed to delete account" });
    }
  });

  // Public pageview tracking (analytics). No auth. Skips api/admin/static paths,
  // derives device from UA + country from the geo header, cleans the referrer to
  // an external hostname, and inserts a pageview. Never fails visibly (a 400
  // only for a missing path; everything else returns ok). Migrated from /api/track.
  app.post("/track", async (request, reply) => {
    try {
      const { path, referrer, sessionId } = (request.body ?? {}) as {
        path?: unknown;
        referrer?: unknown;
        sessionId?: unknown;
      };
      if (!path || typeof path !== "string") {
        return reply.code(400).send({ ok: false });
      }

      // Skip tracking for admin, API, and static asset paths.
      if (path.startsWith("/api") || path.startsWith("/admin") || path.startsWith("/_next")) {
        return reply.send({ ok: true });
      }

      const ua = (request.headers["user-agent"] ?? "").toString();
      const device = /Mobile|Android|iPhone/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop";

      // Country from the geo header (set by the edge/proxy).
      const country = headerString(request.headers["x-vercel-ip-country"]);

      // Clean referrer: keep only an external hostname.
      let cleanReferrer: string | null = null;
      if (referrer && typeof referrer === "string") {
        try {
          const refUrl = new URL(referrer);
          if (!refUrl.hostname.includes("onegoodarea.com") && !refUrl.hostname.includes("localhost")) {
            cleanReferrer = refUrl.hostname;
          }
        } catch {
          // Invalid URL, skip.
        }
      }

      await sql`
        INSERT INTO pageviews (path, referrer, country, device, session_id)
        VALUES (${path.slice(0, 200)}, ${cleanReferrer}, ${country}, ${device}, ${(sessionId as string | undefined) || null})
      `;

      return reply.send({ ok: true });
    } catch {
      return reply.send({ ok: true }); // Never fail visibly.
    }
  });

  // CORS preflight for the public widget.
  app.options("/widget", async (request, reply) => {
    reply.headers(widgetCorsHeaders(headerString(request.headers.origin)));
    return reply.code(204).send();
  });

  // Public embeddable widget: returns a CACHED area summary for a postcode (no
  // auth, CORS-open, rate-limited by origin/IP). Cache-only by design so an
  // unauthenticated embed can never trigger AI spend; 404 on a cache miss.
  // Migrated from /api/widget.
  app.get("/widget", async (request, reply) => {
    const origin = headerString(request.headers.origin);
    reply.headers(widgetCorsHeaders(origin));

    try {
      const q = (request.query ?? {}) as { postcode?: string; intent?: string };
      const postcode = q.postcode;
      const intent = q.intent || "moving";

      if (!postcode) {
        return reply.code(400).send({ error: "Missing postcode parameter" });
      }

      const locationCheck = validateLocationInput(postcode);
      if (!locationCheck.valid) {
        return reply.code(400).send({ error: locationCheck.error });
      }

      const intentCheck = validateIntent(intent);
      if (!intentCheck.valid) {
        return reply.code(400).send({ error: intentCheck.error });
      }

      // Rate limit by origin domain or IP.
      const rateLimitKey = `widget:${origin || headerString(request.headers["x-forwarded-for"]) || "unknown"}`;
      const rl = await rateLimit(rateLimitKey, {
        max: RATE_LIMITS.widget.max,
        windowSeconds: RATE_LIMITS.widget.windowSeconds,
      });
      if (!rl.success) {
        reply.headers(rateLimitHeaders(RATE_LIMITS.widget.max, rl));
        return reply.code(429).send({ error: "Rate limit exceeded. Try again later." });
      }

      // Cache only: widgets serve cached data to prevent unauthenticated AI spend.
      const cached = await getCachedReport(locationCheck.sanitized, intent);
      if (cached) {
        const report = cached.report;
        return reply.send({
          area: report.area,
          postcode: locationCheck.sanitized,
          intent: report.intent,
          score: report.areaiq_score,
          area_type: report.area_type || null,
          dimensions: report.sub_scores.map((s) => ({ label: s.label, score: s.score })),
          powered_by: "https://www.onegoodarea.com",
        });
      }

      return reply.code(404).send({
        error: "No cached data available for this location. Generate a report at https://www.onegoodarea.com first.",
      });
    } catch (error) {
      logger.error("[widget] Error:", error);
      return reply.code(500).send({ error: "Failed to fetch area data" });
    }
  });

  // ── Credentials auth flows (public, pre-login). These standalone REST routes
  // live in apps/api because it owns the users table + crypto + email. NextAuth
  // itself (OAuth, the Credentials provider's sign-in) stays in apps/web; at the
  // cutover its server calls these. Migrated from src/app/api/auth/*. ──

  // Register a credentials user + send a verification email. IP rate-limited.
  app.post("/auth/register", async (request, reply) => {
    try {
      const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
      const rl = await rateLimit(`register:${ip}`, RATE_LIMITS.authRegister);
      if (!rl.success) {
        reply.headers(rateLimitHeaders(RATE_LIMITS.authRegister.max, rl));
        return reply.code(429).send({ error: "Too many attempts. Please try again later." });
      }

      const { email, password, signup_source } = (request.body ?? {}) as { email?: unknown; password?: unknown; signup_source?: unknown };
      const signupSource = normalizeSignupSource(typeof signup_source === "string" ? signup_source : undefined);
      if (!email || typeof email !== "string") {
        return reply.code(400).send({ error: "Email is required" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters" });
      }

      const sanitized = email.trim().toLowerCase();

      const existing = await sql`SELECT id, provider FROM users WHERE email = ${sanitized}`;
      if (existing.length > 0) {
        const { provider } = row<Pick<UserRow, "id" | "provider">>(existing[0]);
        if (provider === "google" || provider === "github") {
          return reply.code(409).send({
            error: "email_oauth",
            message: `This email is linked to a ${provider === "google" ? "Google" : "GitHub"} account. Try signing in with ${provider === "google" ? "Google" : "GitHub"} instead.`,
          });
        }
        return reply.code(409).send({
          error: "email_taken",
          message: "An account with this email already exists. Try signing in instead.",
        });
      }

      const id = generateId("user");
      const name = sanitized.split("@")[0];
      const hash = await hashPassword(password);

      await sql`
        INSERT INTO users (id, email, name, password_hash, provider, email_verified, signup_source)
        VALUES (${id}, ${sanitized}, ${name}, ${hash}, 'credentials', FALSE, ${signupSource})
      `;

      // Levers (AR-194): every new user gets a personal org auto-created
      // (matches the migration backfill formula). Idempotent — safe if the
      // user re-signs-up after deletion or if the helper races with anything.
      // Best-effort: a failure here does NOT block account creation; the
      // lazy ensure-org path on /v1/orgs covers it.
      try {
        await createPersonalOrgForUser(id, sanitized);
      } catch (e) {
        logger.error("Failed to create personal org for new user:", e);
      }

      // Send verification email (best-effort; account is created regardless).
      try {
        const token = generateToken();
        const tokenId = generateId("evt");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await sql`
          INSERT INTO email_verification_tokens (id, user_id, email, token, expires_at)
          VALUES (${tokenId}, ${id}, ${sanitized}, ${token}, ${expiresAt})
        `;
        await sendVerificationEmail(sanitized, token);
      } catch (e) {
        logger.error("Failed to send verification email:", e);
      }

      return reply.send({ ok: true });
    } catch (error) {
      logger.error("Register error:", error);
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      return reply.code(500).send({ error: "server_error", message: "Something went wrong. Please try again." });
    }
  });

  // Re-send a verification email. Always 200 (anti-enumeration) except its own
  // 3-per-hour throttle. Migrated from /api/auth/resend-verification.
  app.post("/auth/resend-verification", async (request, reply) => {
    try {
      const { email } = (request.body ?? {}) as { email?: unknown };
      if (!email || typeof email !== "string") {
        return reply.code(400).send({ error: "Email is required" });
      }
      const sanitized = email.trim().toLowerCase();

      const result = await sql`
        SELECT id, email_verified, provider FROM users WHERE email = ${sanitized}
      `;
      if (result.length === 0) return reply.send({ ok: true });

      const user = result[0];
      if (user.email_verified || user.provider !== "credentials") return reply.send({ ok: true });

      const recentTokens = await sql`
        SELECT COUNT(*) as count FROM email_verification_tokens
        WHERE email = ${sanitized} AND created_at > NOW() - INTERVAL '1 hour'
      `;
      if (Number(recentTokens[0].count) >= 3) {
        return reply.code(429).send({ error: "Too many requests. Please try again later." });
      }

      await sql`
        UPDATE email_verification_tokens SET used = TRUE
        WHERE user_id = ${user.id} AND used = FALSE
      `;

      const token = generateToken();
      const tokenId = generateId("evt");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await sql`
        INSERT INTO email_verification_tokens (id, user_id, email, token, expires_at)
        VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
      `;
      await sendVerificationEmail(sanitized, token);

      return reply.send({ ok: true });
    } catch (error) {
      logger.error("[resend-verification] Error:", error);
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // Request a password reset email. Always 200 (anti-enumeration). 3/hour.
  // Migrated from /api/auth/forgot-password.
  app.post("/auth/forgot-password", async (request, reply) => {
    try {
      const { email } = (request.body ?? {}) as { email?: unknown };
      if (!email || typeof email !== "string") {
        return reply.code(400).send({ error: "Email is required" });
      }
      const sanitized = email.trim().toLowerCase();

      const result = await sql`
        SELECT id, email, provider, password_hash FROM users WHERE email = ${sanitized}
      `;
      if (result.length === 0) return reply.send({ ok: true });

      const user = result[0];
      // No password to reset for OAuth-only users.
      if (user.provider !== "credentials" && !user.password_hash) return reply.send({ ok: true });

      const recentTokens = await sql`
        SELECT COUNT(*) as count FROM password_reset_tokens
        WHERE email = ${sanitized} AND created_at > NOW() - INTERVAL '1 hour'
      `;
      if (Number(recentTokens[0].count) >= 3) return reply.send({ ok: true });

      await sql`
        UPDATE password_reset_tokens SET used = TRUE
        WHERE user_id = ${user.id} AND used = FALSE
      `;

      const token = generateToken();
      const tokenId = generateId("prt");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await sql`
        INSERT INTO password_reset_tokens (id, user_id, email, token, expires_at)
        VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
      `;
      await sendPasswordResetEmail(sanitized, token);

      return reply.send({ ok: true });
    } catch (error) {
      logger.error("[forgot-password] Error:", error);
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // Complete a password reset with a token. Migrated from /api/auth/reset-password.
  app.post("/auth/reset-password", async (request, reply) => {
    try {
      const { token, password } = (request.body ?? {}) as { token?: unknown; password?: unknown };
      if (!token || typeof token !== "string") {
        return reply.code(400).send({ error: "Invalid reset link" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return reply.code(400).send({ error: "Password must be at least 8 characters" });
      }

      const result = await sql`
        SELECT user_id, email, expires_at, used FROM password_reset_tokens WHERE token = ${token}
      `;
      if (result.length === 0) {
        return reply.code(400).send({ error: "Invalid or expired reset link" });
      }

      const record = row<Pick<PasswordResetTokenRow, "user_id" | "email" | "expires_at" | "used">>(result[0]);
      if (record.used) {
        return reply.code(400).send({ error: "This reset link has already been used" });
      }
      if (new Date(record.expires_at) < new Date()) {
        return reply.code(400).send({ error: "This reset link has expired. Please request a new one." });
      }

      const hash = await hashPassword(password);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${record.user_id}`;
      await sql`UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}`;

      return reply.send({ ok: true });
    } catch (error) {
      logger.error("[reset-password] Error:", error);
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // Change the logged-in user's password (verifies the current one first).

  // Validate email + password and return the user object. Public endpoint used
  // by the NextAuth credentials provider's authorize() callback via the web
  // container's BFF proxy. Rate-limited: 5 attempts/min per IP.
  // New for AR-203 Phase 1B — web auth migration.
  app.post("/auth/login", async (request, reply) => {
    try {
      const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
      const rl = await rateLimit(`login:${ip}`, {
        max: 5,
        windowSeconds: 60,
      });
      if (!rl.success) {
        reply.headers(rateLimitHeaders(5, rl));
        return reply.code(429).send({ error: "Too many attempts. Please try again later." });
      }

      const { email, password } = (request.body ?? {}) as { email?: unknown; password?: unknown };
      if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        return reply.code(400).send({ error: "Email and password are required" });
      }

      const sanitized = email.trim().toLowerCase();
      const result = await sql`
        SELECT id, email, name, image, password_hash FROM users
        WHERE email = ${sanitized} AND provider = 'credentials'
      `;
      if (result.length === 0 || !result[0].password_hash) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      const foundUser = row<
        Pick<UserRow, "id" | "email" | "name" | "image" | "password_hash">
      >(result[0]);

      const { valid, needsRehash } = await verifyPassword(password as string, foundUser.password_hash!);
      if (!valid) {
        return reply.code(401).send({ error: "invalid_credentials" });
      }

      // Transparently upgrade legacy SHA-256 hashes to PBKDF2
      if (needsRehash) {
        const newHash = await hashPassword(password as string);
        sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${foundUser.id}`.catch(() => {});
      }

      return reply.send({
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
      });
    } catch (error) {
      logger.error("Login error:", error);
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // Request a magic-link sign-in email. Always 200 (anti-enumeration) except
  // for rate limit (3/min per IP). Mints a 15-minute token in magic_link_tokens
  // and sends the email via the configured provider.
  // New for AR-203 Phase 1B — web auth migration.
  app.post("/auth/magic-link/request", async (request, reply) => {
    try {
      const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
      const rl = await rateLimit(`magic-link-request:${ip}`, {
        max: 3,
        windowSeconds: 60,
      });
      if (!rl.success) {
        reply.headers(rateLimitHeaders(3, rl));
        return reply.code(429).send({ error: "Too many attempts. Please try again in a minute." });
      }

      const { email } = (request.body ?? {}) as { email?: unknown };
      if (!email || typeof email !== "string" || email.trim().length === 0 || !email.includes("@")) {
        return reply.send({ ok: true });
      }

      const sanitized = email.trim().toLowerCase();

      const users = await sql`SELECT id, provider FROM users WHERE email = ${sanitized}`;
      if (users.length === 0 || (users[0].provider && users[0].provider !== "credentials")) {
        return reply.send({ ok: true });
      }

      const user = row<Pick<UserRow, "id" | "provider">>(users[0]);
      const token = generateToken();
      const tokenId = generateId("mlt");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      await sql`
        INSERT INTO magic_link_tokens (id, user_id, email, token, expires_at)
        VALUES (${tokenId}, ${user.id}, ${sanitized}, ${token}, ${expiresAt})
      `;

      try {
        await sendMagicLinkEmail(sanitized, token);
      } catch (e) {
        logger.error("Magic link email send failed:", e);
      }

      return reply.send({ ok: true });
    } catch (e) {
      logger.error("Magic link request error:", e);
      return reply.send({ ok: true });
    }
  });

  // Check whether an email address has an account, and which provider.
  // Rate-limited (20/min per IP). Used by the /get-started email-first flow.
  // New for AR-203 Phase 1B — web auth migration.
  app.get("/auth/check-email", async (request, reply) => {
    try {
      const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
      const rl = await rateLimit(`check-email:${ip}`, {
        max: 20,
        windowSeconds: 60,
      });
      if (!rl.success) {
        reply.headers(rateLimitHeaders(20, rl));
        return reply.code(429).send({ error: "Too many attempts. Please try again later." });
      }

      const query = request.query as { email?: string };
      const rawEmail = query.email;
      if (!rawEmail || typeof rawEmail !== "string") {
        return reply.code(400).send({ error: "Email is required" });
      }

      const email = rawEmail.trim().toLowerCase();
      if (email.length === 0 || !email.includes("@")) {
        return reply.send({ exists: false });
      }

      const result = await sql`SELECT provider FROM users WHERE email = ${email}`;
      if (result.length === 0) {
        return reply.send({ exists: false });
      }

      const { provider } = row<Pick<UserRow, "provider">>(result[0]);
      return reply.send({ exists: true, provider: provider ?? "credentials" });
    } catch (error) {
      logger.error("[check-email] Error:", error);
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // POST variant — web /get-started sends email in JSON body rather than
  // query string. Same logic as GET, different input source.
  // Added for AR-203 Phase 1B — web auth migration.
  app.post("/auth/check-email", async (request, reply) => {
    try {
      const ip = headerString(request.headers["x-forwarded-for"])?.split(",")[0]?.trim() || "unknown";
      const rl = await rateLimit(`check-email:${ip}`, {
        max: 20,
        windowSeconds: 60,
      });
      if (!rl.success) {
        reply.headers(rateLimitHeaders(20, rl));
        return reply.code(429).send({ error: "Too many attempts. Please try again later." });
      }

      const body = request.body as { email?: unknown } | undefined;
      const rawEmail = body?.email;
      if (!rawEmail || typeof rawEmail !== "string") {
        return reply.code(400).send({ error: "Email is required" });
      }

      const email = rawEmail.trim().toLowerCase();
      if (email.length === 0 || !email.includes("@")) {
        return reply.send({ exists: false });
      }

      const result = await sql`SELECT provider FROM users WHERE email = ${email}`;
      if (result.length === 0) {
        return reply.send({ exists: false });
      }

      const { provider } = row<Pick<UserRow, "provider">>(result[0]);
      return reply.send({ exists: true, provider: provider ?? "credentials" });
    } catch (error) {
      logger.error("[check-email] Error:", error);
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // Handle OAuth sign-in callback from NextAuth. Upserts the user (creates if
  // new, updates name/image if changed) and returns the user id. Also tracks
  // the sign-in event. Called by the NextAuth signIn() callback via the web
  // container's BFF proxy.
  // New for AR-203 Phase 1B — web auth migration.
  app.post("/auth/oauth-callback", async (request, reply) => {
    try {
      const { email, name, image, provider } = (request.body ?? {}) as {
        email?: unknown;
        name?: unknown;
        image?: unknown;
        provider?: unknown;
      };

      if (!email || typeof email !== "string") {
        return reply.code(400).send({ error: "Email is required" });
      }
      const safeProvider = provider === "google" || provider === "github" ? provider : undefined;
      if (!safeProvider) {
        return reply.code(400).send({ error: "Provider must be google or github" });
      }

      const sanitized = email.trim().toLowerCase();
      const existing = await sql`SELECT id FROM users WHERE email = ${sanitized}`;

      let id: string;
      if (existing.length === 0) {
        id = generateId("user");
        await sql`
          INSERT INTO users (id, email, name, image, provider, email_verified)
          VALUES (${id}, ${sanitized}, ${String(name ?? "")}, ${image ? String(image) : null}, ${safeProvider}, TRUE)
        `;
      } else {
        id = row<Pick<UserRow, "id">>(existing[0]).id;
        await sql`
          UPDATE users SET name = ${String(name ?? "")}, image = ${image ? String(image) : null}
          WHERE id = ${id}
        `;
      }

      trackEvent("auth.signin", id, { provider: safeProvider });

      return reply.send({ id });
    } catch (error) {
      logger.error("OAuth callback error:", error);
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  // Session-authed; credentials accounts only. Migrated from
  // /api/settings/password.
  app.post("/settings/password", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const { currentPassword, newPassword } = (request.body ?? {}) as {
        currentPassword?: unknown;
        newPassword?: unknown;
      };

      if (!currentPassword || !newPassword) {
        return reply.code(400).send({ error: "Both fields are required" });
      }
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return reply.code(400).send({ error: "New password must be at least 8 characters" });
      }

      const result = await sql`SELECT password_hash, provider FROM users WHERE id = ${userId}`;
      if (result.length === 0) {
        return reply.code(404).send({ error: "User not found" });
      }

      const userRecord = row<Pick<UserRow, "password_hash" | "provider">>(result[0]);
      if (userRecord.provider !== "credentials" || !userRecord.password_hash) {
        return reply.code(400).send({ error: "Password change is only available for email/password accounts" });
      }

      const { valid } = await verifyPassword(currentPassword as string, userRecord.password_hash);
      if (!valid) {
        return reply.code(403).send({ error: "Current password is incorrect" });
      }

      const newHash = await hashPassword(newPassword);
      await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${userId}`;

      return reply.send({ success: true });
    } catch (error) {
      logger.error("Password change error:", error);
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      return reply.code(500).send({ error: "Failed to change password" });
    }
  });

  // Generate a report from the dashboard (browser flow). Session-authed; rate-
  // limited per user; counts against the monthly quota; emails the report.
  // Distinct from the api-key POST /v1/report. Migrated from /api/report.
  app.post("/report", {
    schema: { tags: ["Reports"], summary: "Generate report (web)", description: "Generates a report and returns the rendered HTML page. Web-only endpoint." },
  }, async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      // Rate limit by user id.
      const rl = await rateLimit(`report:${userId}`, {
        max: RATE_LIMITS.report.max,
        windowSeconds: RATE_LIMITS.report.windowSeconds,
      });
      reply.headers(rateLimitHeaders(RATE_LIMITS.report.max, rl));
      if (!rl.success) {
        return reply.code(429).send({ error: "Too many requests. Please wait before generating another report." });
      }

      const usage = await canGenerateReport(userId);
      if (!usage.allowed) {
        return reply.code(403).send({ error: "limit_reached", used: usage.used, limit: usage.limit, plan: usage.plan });
      }

      const body = (request.body ?? {}) as { area?: unknown; intent?: unknown };
      const locationCheck = validateLocationInput(body.area);
      if (!locationCheck.valid) return reply.code(400).send({ error: locationCheck.error });
      const intentCheck = validateIntent(body.intent);
      if (!intentCheck.valid) return reply.code(400).send({ error: intentCheck.error });

      const intent = body.intent as Intent;
      const result = await generateReport(locationCheck.sanitized, intent, userId);
      trackEvent("report.generated", userId, {
        area: body.area,
        intent,
        reportId: result.id,
        score: result.report?.areaiq_score,
      });

      // Email the report (best-effort). The recipient is resolved from the DB by
      // userId (the bridge token carries only the id, not the email — the legacy
      // route read session.user.email, which is the same authoritative value).
      const userEmail = await getUserEmail(userId);
      if (userEmail && result.report) {
        try {
          await sendReportEmail(userEmail, result.id, result.report);
        } catch (err) {
          logger.error("[report-email] Failed to send:", err);
        }
      }

      return reply.send(result);
    } catch (error) {
      if (isAppError(error)) {
        return reply.code(error.statusCode).send({ error: error.message, code: error.code });
      }
      logger.error("Report generation error:", error);
      return reply.code(500).send({ error: "Failed to generate report" });
    }
  });

  // The caller's saved areas (watchlist). Session-authed. Migrated from
  // /api/watchlist. (Schema confirmed against the live dashboards; see the
  // saved_areas migration note.)
  app.get("/watchlist", {
    schema: { tags: ["Watchlist"], summary: "Get watchlist", description: "Get the authenticated user's saved areas watchlist." },
  }, async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const areas = await sql`
        SELECT id, postcode, label, intent, created_at
        FROM saved_areas
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return reply.send({ areas });
    } catch (error) {
      logger.error("Watchlist fetch error:", error);
      return reply.code(500).send({ error: "Failed to fetch watchlist" });
    }
  });

  // Save an area to the watchlist. Session-authed. 409 if already saved.
  app.post("/watchlist", {
    schema: { tags: ["Watchlist"], summary: "Add to watchlist", description: "Add an area to the user's watchlist." },
  }, async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const body = (request.body ?? {}) as { postcode?: unknown; label?: unknown; intent?: unknown };
      const postcode = (typeof body.postcode === "string" ? body.postcode : "").trim().toUpperCase();
      const label = (typeof body.label === "string" ? body.label : "").trim();
      const intent = (body.intent as string | undefined) || null;

      if (!postcode) {
        return reply.code(400).send({ error: "Postcode is required" });
      }

      const result = await sql`
        INSERT INTO saved_areas (user_id, postcode, label, intent)
        VALUES (${userId}, ${postcode}, ${label}, ${intent})
        ON CONFLICT (user_id, postcode) DO NOTHING
        RETURNING id, postcode, label, intent, created_at
      `;
      if (result.length === 0) {
        return reply.code(409).send({ error: "Area already saved" });
      }
      return reply.code(201).send({ area: result[0] });
    } catch (error) {
      logger.error("Watchlist add error:", error);
      return reply.code(500).send({ error: "Failed to save area" });
    }
  });

  // Remove an area from the watchlist. Session-authed. Migrated from
  // /api/watchlist/[id].
  app.delete<{ Params: { id: string } }>("/watchlist/:id", {
    schema: { tags: ["Watchlist"], summary: "Remove from watchlist", description: "Remove an area from the user's watchlist." },
  }, async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply; // 401 already sent

      const result = await sql`
        DELETE FROM saved_areas
        WHERE id = ${request.params.id} AND user_id = ${userId}
        RETURNING id
      `;
      if (result.length === 0) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.send({ ok: true });
    } catch (error) {
      logger.error("Watchlist delete error:", error);
      return reply.code(500).send({ error: "Failed to remove area" });
    }
  });

  // Re-score the top UK postcodes into report_history (the time-series moat).
  // Authenticated by CRON_SECRET (the container scheduler sends it as a Bearer
  // token), not session/api-key. ?limit=N + ?dry_run=true supported. Migrated
  // from /api/cron/rescore; the worker logic lives in modules/reports/rescore.

  // Admin analytics — aggregate usage + revenue (superuser only).
  app.get("/admin/analytics", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply;
      if (!(await isSuperuser(userId))) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      const data = await getAnalytics();
      return reply.send(data);
    } catch (error) {
      logger.error("Admin analytics error:", error);
      return reply.code(500).send({ error: "Failed to fetch analytics" });
    }
  });

  // Admin traffic analytics — pageview aggregation (superuser only).
  app.get("/admin/traffic-analytics", async (request, reply) => {
    try {
      const userId = await authenticateSession(request, reply);
      if (!userId) return reply;
      if (!(await isSuperuser(userId))) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      const data = await getTrafficAnalytics();
      if (!data) return reply.code(503).send({ error: "Traffic data unavailable" });
      return reply.send(data);
    } catch (error) {
      logger.error("Admin traffic analytics error:", error);
      return reply.code(500).send({ error: "Failed to fetch traffic analytics" });
    }
  });

  /* AR-313 Phase 1: composite "who's using us" stats for the admin
     Audience tab. Session-authed + superuser-gated like the other
     admin endpoints. Returns users / orgs / geo in one round-trip. */
  app.get("/admin/audience",
    {
      schema: {
        tags: ["Admin"],
        summary: "Audience stats (superuser only)",
        description: "Composite stats for the Audience tab: total/active users, signup curve, orgs by size + activity, top countries, churn signal.",
      },
    },
    async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;
        if (!(await isSuperuser(userId))) {
          return reply.code(403).send({ error: "Forbidden" });
        }
        const data = await getAudienceStats();
        return reply.send(data);
      } catch (error) {
        logger.error("Admin audience stats error:", error);
        return reply.code(500).send({ error: "Failed to fetch audience stats" });
      }
    });

  /* AR-313 Phase 2: composite "what they're using" stats. Per-product
     breakdown (5 buckets via apps/api-side mapping) + top 20 endpoints
     by call count over the last 30d. */
  app.get("/admin/usage",
    {
      schema: {
        tags: ["Admin"],
        summary: "Usage stats (superuser only)",
        description: "Composite stats for the Usage tab: per-product call counts + endpoint heatmap.",
      },
    },
    async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;
        if (!(await isSuperuser(userId))) {
          return reply.code(403).send({ error: "Forbidden" });
        }
        const data = await getUsageStats();
        return reply.send(data);
      } catch (error) {
        logger.error("Admin usage stats error:", error);
        return reply.code(500).send({ error: "Failed to fetch usage stats" });
      }
    });

  app.get("/cron/rescore", async (request, reply) => {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return reply.code(503).send({ error: "CRON_SECRET not configured on this deployment" });
    }
    if (request.headers.authorization !== `Bearer ${expected}`) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const q = (request.query ?? {}) as { limit?: string; dry_run?: string };
    const limit = q.limit ? parseInt(q.limit, 10) : undefined;
    const dryRun = q.dry_run === "true";

    try {
      const summary = await runRescoreCron({ limit, dryRun });
      logger.info("[cron/rescore] done", summary);
      return reply.send(summary);
    } catch (err) {
      logger.error("[cron/rescore] fatal", err);
      return reply.code(500).send({ error: err instanceof Error ? err.message : "Cron failed" });
    }
  });

  return app;
}
