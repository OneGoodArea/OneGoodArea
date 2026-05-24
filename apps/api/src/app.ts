import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { INTENTS, type Intent } from "@onegoodarea/contracts";
import { validateApiKey, createApiKey, listApiKeys, revokeApiKey } from "./modules/api-keys";
import { verifySessionToken } from "./modules/auth/session-token";
import { sql } from "./infrastructure/db/client";
import { rows, row, type ReportRow, type SubscriptionRow, type ApiKeyRow, type ActivityEventRow } from "./infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "./infrastructure/rate-limit";
import { RATE_LIMITS, BATCH_MAX_ITEMS, APP_URL } from "./infrastructure/config";
import {
  getUserPlan,
  hasApiAccess,
  canGenerateReport,
  hasMcpAccess,
  trackMcpCall,
  listAddons,
  getMcpUsageThisMonth,
  getStripeCustomerId,
  getUserEmail,
  hasAddon,
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
import { type BatchItem, isBatchItemArray, isSuccess, processBatchItems } from "./modules/reports/batch";
import { trackEvent } from "./modules/tracking/activity";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  revokeWebhookSubscription,
  validateWebhookUrl,
  validateEventTypes,
} from "./modules/webhooks";
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

/* Standalone backend factory.

   buildApp() is a pure factory so tests can drive it via app.inject() without
   binding a port. The reports vertical is migrated; endpoints are being wired
   on top of it. /v1/meta imports from @onegoodarea/contracts to prove the
   monorepo wiring (backend consumes the shared package). */

/** Bearer-token auth. Resolves the userId, or sends a 401 and resolves null.
   Shared by every authenticated route (today /me/reports; soon /v1/report). */
async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
    return null;
  }
  const userId = await validateApiKey(header.slice(7));
  if (!userId) {
    reply.code(401).send({ error: "Invalid or revoked API key" });
    return null;
  }
  return userId;
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

/* Local row shapes for the API-key usage dashboard query (GET /keys/usage). */
interface CountRow { count: number; }
interface DayCountRow { day: string; count: number; }
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & { key_preview: string };

export function buildApp(opts: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

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
  app.get("/health", async () => ({ status: "ok" }));

  // Proves apps/api can consume packages/contracts (shared source of truth).
  app.get("/v1/meta", async () => ({
    service: "onegoodarea-api",
    phase: "1-reports-vertical",
    intents: INTENTS,
  }));

  // The authenticated caller's recent reports (dashboard / "my reports" list).
  app.get("/me/reports", async (request, reply) => {
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

  // The authenticated caller's plan + entitlements. Used by the MCP server at
  // startup to check mcpAccess, and by any consumer needing entitlement without
  // running a report. Migrated from the legacy /api/v1/me route.
  app.get("/v1/me", async (request, reply) => {
    const authHeader = headerString(request.headers.authorization);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
    }
    const apiKey = authHeader.slice(7);
    const userId = await validateApiKey(apiKey);
    if (!userId) return reply.code(401).send({ error: "Invalid or revoked API key" });

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
    };
  });

  // Generate (or replay) a report for a postcode/area. The public REST entry
  // point. Mirrors the legacy /api/v1/report route: auth -> rate-limit -> API
  // access -> monthly quota -> input validation -> engine-version pin -> MCP
  // gate -> idempotency-wrapped generateReport.
  app.post("/v1/report", async (request, reply) => {
    try {
      const authHeader = headerString(request.headers.authorization);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
      }
      const apiKey = authHeader.slice(7);
      const userId = await validateApiKey(apiKey);
      if (!userId) return reply.code(401).send({ error: "Invalid or revoked API key" });

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

  // AR-130 bulk scoring: up to BATCH_MAX_ITEMS areas per call, bounded
  // concurrency, per-item result array. Pre-checks total quota (fail fast).
  // Migrated from the legacy /api/v1/batch route.
  app.post("/v1/batch", async (request, reply) => {
    try {
      const authHeader = headerString(request.headers.authorization);
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "Missing API key. Use: Authorization: Bearer oga_..." });
      }
      const apiKey = authHeader.slice(7);
      const userId = await validateApiKey(apiKey);
      if (!userId) return reply.code(401).send({ error: "Invalid or revoked API key" });

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
  app.post("/v1/webhooks", async (request, reply) => {
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
          error: "events must be a non-empty array of supported types: 'report.created' or 'score.changed'",
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
  app.get("/v1/webhooks", async (request, reply) => {
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
  app.delete<{ Params: { id: string } }>("/v1/webhooks/:id", async (request, reply) => {
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
      const [totalRequests, requestsThisMonth, requestsByDay, lastRequest, apiKeys] = await Promise.all([
        sql`
          SELECT COUNT(*)::int as count
          FROM activity_events
          WHERE user_id = ${userId} AND event = 'api.report.generated'
        `,
        sql`
          SELECT COUNT(*)::int as count
          FROM activity_events
          WHERE user_id = ${userId}
            AND event = 'api.report.generated'
            AND created_at >= date_trunc('month', NOW())
        `,
        sql`
          SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
          FROM activity_events
          WHERE user_id = ${userId}
            AND event = 'api.report.generated'
            AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY day
          ORDER BY day
        `,
        sql`
          SELECT created_at
          FROM activity_events
          WHERE user_id = ${userId} AND event = 'api.report.generated'
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
  app.get<{ Params: { id: string } }>("/report/:id", async (request, reply) => {
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
  app.delete<{ Params: { id: string } }>("/report/:id", async (request, reply) => {
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

  return app;
}
