import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { INTENTS, type Intent, isIntent, SIGNAL_CATEGORIES, isSignalCategory } from "@onegoodarea/contracts";
import { validateApiKey, createApiKey, listApiKeys, revokeApiKey } from "./modules/api-keys";
import { hashPassword, verifyPassword, generateToken } from "./modules/auth/crypto";
import { normalizeSignupSource } from "./modules/auth/signup-source";
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
import { getAnalytics, getTrafficAnalytics, getAudienceStats, getUsageStats, getRevenueExtras } from "./modules/admin";

import { handleStripeWebhook } from "./modules/billing/webhook-handler";
import { isAppError } from "./infrastructure/errors/custom-errors";
import { logger } from "./modules/tracking/structured-logger";


// -- Shared helpers (moved from inline to shared/ per AR-286) --
import { isFromMcpServer, headerString, clientIpOf, widgetCorsHeaders } from "./shared/http";
import { authenticate, requireApiAccess, requireApiAccessWithOrg } from "./shared/auth-api";
import { authenticateEither } from "./shared/auth-either";
import { authenticateSession } from "./shared/auth-session";
import { resolveBundleForCaller, effectiveEngineVersionForCaller } from "./shared/bundles";
import { registerSystemRoutes } from "./routes/system";
import { registerAuthRoutes } from "./routes/auth";
import { registerMeRoutes } from "./routes/me";
import { registerApiKeysRoutes } from "./routes/api-keys";
import { registerReportsRoutes } from "./routes/reports";
import { registerStripeRoutes } from "./routes/stripe";
import { registerWebhooksRoutes } from "./routes/webhooks";
import { registerAdminRoutes } from "./routes/admin";
declare module "fastify" {
  interface FastifyRequest {
    /** Raw request body string, preserved by the JSON content-type parser so the
        Stripe webhook can verify the HMAC signature over the exact payload. */
    rawBody?: string;
  }
}


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

  registerSystemRoutes(app);
  registerAuthRoutes(app);
  registerMeRoutes(app);
  registerApiKeysRoutes(app);
  registerReportsRoutes(app);
  registerStripeRoutes(app);
  registerWebhooksRoutes(app);
  registerAdminRoutes(app);

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
      }, ctx.orgId);

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

      const ctx = await requireApiAccessWithOrg(request, reply);
      if (!ctx) return reply; // 401 / 403 / 429 already sent
      const { userId } = ctx;

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
      }, ctx.orgId);

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
      }, ctx.orgId);
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
      }, ctx.orgId);
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

  /* AR-289: ctx-flavoured guard for routes that emit api.* trackEvent
     and need to tag the event with the caller's org_id. Same flag +
     auth + rate-limit + plan gate as guardSignals; just returns
     {userId, orgId} so trackEvent can write activity_events.org_id. */
  const guardSignalsCtx = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ userId: string; orgId: string | null } | null> => {
    if (!getConfig().signalsApiEnabled) { reply.code(404).send({ error: "Not found" }); return null; }
    return requireApiAccessWithOrg(request, reply);
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
      const ctx = await guardSignalsCtx(request, reply);
      if (!ctx) return reply;
      const { userId } = ctx;
      const name = typeof (request.body as { name?: unknown })?.name === "string" ? (request.body as { name: string }).name.trim() : "";
      if (!name) return reply.code(400).send({ error: "Missing required 'name'." });
      if (name.length > 200) return reply.code(400).send({ error: "name too long (max 200 chars)." });
      const portfolio = await createPortfolio(userId, name);
      trackEvent("api.portfolio.created", userId, { portfolioId: portfolio.id }, ctx.orgId);
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
      const ctx = await guardSignalsCtx(request, reply);
      if (!ctx) return reply;
      const { userId } = ctx;
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
      trackEvent("api.portfolio.areas_added", userId, { portfolioId: id, added: result.added }, ctx.orgId);
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
      const ctx = await guardSignalsCtx(request, reply);
      if (!ctx) return reply;
      const { userId } = ctx;
      const { id } = request.params as { id: string };
      const presetRaw = (request.body as { preset?: unknown })?.preset;
      if (presetRaw !== undefined && !isIntent(presetRaw)) {
        return reply.code(400).send({ error: "preset must be one of: moving, business, investing, research." });
      }
      const items = await enrichPortfolio(userId, id, (presetRaw as Intent) ?? "research");
      if (!items) return reply.code(404).send({ error: "Portfolio not found" });
      trackEvent("api.portfolio.enriched", userId, { portfolioId: id, areas: items.length }, ctx.orgId);
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
      const ctx = await guardSignalsCtx(request, reply);
      if (!ctx) return reply;
      const { userId } = ctx;
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
      trackEvent("api.portfolio.changes_checked", userId, { portfolioId: id, material: report.material_count }, ctx.orgId);
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
      trackEvent("api.org.created", userId, { orgId: org.id }, org.id);
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
      trackEvent("api.org.updated", userId, { orgId: id }, id);
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
      trackEvent("api.org.member_added", userId, { orgId: id, addedUserId: parsed.data.user_id }, id);
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
      }, orgId);
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
      trackEvent("api.org.member_removed", callerId, { orgId: id, removedUserId: targetId }, id);
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
      }, orgId);
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
      trackEvent("api.org.invitation_revoked", callerId, { orgId, invitationId }, orgId);
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
      }, result.org_id);
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
      trackEvent("api.bundle.created", userId, { orgId, bundleId: bundle.id, count: bundle.signal_keys.length }, orgId);
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
      trackEvent("api.bundle.updated", userId, { orgId, bundleId }, orgId);
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
      trackEvent("api.bundle.deleted", userId, { orgId, bundleId }, orgId);
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
      trackEvent("api.preset.created", userId, { orgId, presetId: preset.id, basePreset: preset.base_preset }, orgId);
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
      trackEvent("api.preset.updated", userId, { orgId, presetId }, orgId);
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
      trackEvent("api.preset.deleted", userId, { orgId, presetId }, orgId);
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
      trackEvent("api.methodology.pinned", userId, { orgId, engineVersion: parsed.data.engine_version }, orgId);
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
      trackEvent("api.cohort.created", userId, { orgId, cohortId: cohort.id, size: cohort.geo_codes.length }, orgId);
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
      trackEvent("api.cohort.updated", userId, { orgId, cohortId }, orgId);
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
      trackEvent("api.cohort.deleted", userId, { orgId, cohortId }, orgId);
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
        trackEvent("api.methodology.unpinned", userId, { orgId }, orgId);
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
      }, ctx.orgId);
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
      }, ctx.orgId);
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
      const ctx = await guardSignalsCtx(request, reply);
      if (!ctx) return reply;
      const { userId } = ctx;

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
      }, ctx.orgId);
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
      const ctx = await guardSignalsCtx(request, reply);
      if (!ctx) return reply;
      const { userId } = ctx;

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
      }, ctx.orgId);
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
      /* AR-289: stash the api key's org for the api.batch.processed
         trackEvent below, which fires inside withIdempotency where `result`
         shadows this one. */
      const apiKeyOrgId = result.orgId ?? null;

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
          trackEvent("api.batch.processed", userId, { batch_size: items.length, succeeded, failed }, apiKeyOrgId);
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


  return app;
}
