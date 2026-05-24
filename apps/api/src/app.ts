import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { INTENTS, type Intent } from "@onegoodarea/contracts";
import { validateApiKey } from "./modules/api-keys";
import { sql } from "./infrastructure/db/client";
import { rows, type ReportRow } from "./infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "./infrastructure/rate-limit";
import { RATE_LIMITS, BATCH_MAX_ITEMS } from "./infrastructure/config";
import {
  getUserPlan,
  hasApiAccess,
  canGenerateReport,
  hasMcpAccess,
  trackMcpCall,
  listAddons,
  getMcpUsageThisMonth,
} from "./modules/usage";
import { PLANS } from "./modules/billing/plans";
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

  return app;
}
