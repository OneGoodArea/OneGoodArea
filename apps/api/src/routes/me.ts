import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { authenticateSessionOrApiKey } from "../shared/auth-session";
import { headerString, clientIpOf } from "../shared/http";
import { sendAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { rows, row, type SubscriptionRow } from "../infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { validateApiKey } from "../modules/api-keys";
import { getUserPlan, hasApiAccess, hasMcpAccess, canMakeApiCall, listAddons, getMcpUsageThisMonth, isSuperuser, getUserTier, resolveUserType } from "../modules/usage";
import { PLANS } from "../modules/billing/plans";
import { METHODOLOGY_VERSION } from "../modules/engine/methodology";
import { listForUser as listActivityForUser } from "../modules/activity";


import { getMonthlyApiCallCount, hasAddon } from "../modules/usage";
import { asSubscription } from "../modules/billing/stripe-types";
import { stripe } from "../modules/billing/stripe-client";
import type { PlanId } from "../modules/billing/plans";
import { getOrgIfMember, getRoleInOrg, updateOrg, hasAtLeastRole } from "../modules/orgs";
import { UpdateOrgRequestSchema, type OrgRole } from "@onegoodarea/contracts";
import { UsageCheckResponseSchema, MeActivityResponseSchema } from "@onegoodarea/contracts";
import {
  ListWebhooksResponseSchema,
  CreatedWebhookSchema,
  MePortfoliosResponseSchema,
  ScoreUsageResponseSchema,
  MeOrgResponseSchema,
  UpdateMeOrgResponseSchema,
  MeProfileResponseSchema,
  DashboardResponseSchema,
  SubscriptionInfoResponseSchema,
  WatchlistResponseSchema,
  AddToWatchlistResponseSchema,
  MeUserTypeResponseSchema,
} from "@onegoodarea/contracts";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  revokeWebhookSubscription,
  rotateWebhookSecret,
  validateWebhookUrl,
  validateEventTypes,
} from "../modules/webhooks";

const IdParamsSchema = z.object({ id: z.string() });

interface SavedAreaRow {
  id: string;
  postcode: string;
  label: string | null;
  intent: string | null;
  created_at: string;
}

/** me route handlers — extracted from app.ts per AR-286. */
export function registerMeRoutes(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();
    typed.get("/me/activity",
      {
        schema: {
            "tags": [
                "Reports"
            ],
            "summary": "My activity log",
            "description": "Recent API activity for the authenticated user.",
            "security": [{ "bearerToken": [] }, { "bearerAuth": [] }],
            /* AR-548: `.catch` not `.default`. This endpoint has always
               normalised unparseable paging params to the defaults rather than
               rejecting; `.default` only covers a missing value, so garbage
               like ?page=abc became a 400. */
            "querystring": z.object({
              page: z.coerce.number().int().catch(1),
              page_size: z.coerce.number().int().catch(20),
            }),
          response: {
            200: MeActivityResponseSchema,
            500: z.object({ error: z.string() }),
          },
        },
      }, async (request, reply) => {
      const userId = await authenticateSessionOrApiKey(request, reply);
      if (!userId) return reply;

      const { page: rawPage, page_size: rawSize } = request.query;
      const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
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

    typed.get("/me/user-type",
      {
        schema: {
          tags: ["Me"],
          summary: "My user type",
          description: "Returns { user_type: UserType }. Session-authed; 401 if not signed in. Replaces the deprecated /me/is-superuser endpoint.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: MeUserTypeResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;
        const user_type = await resolveUserType(userId);
        return reply.code(200).send({ user_type });
      });

    /* AR-500 (Plan 045): self-scoped tier read. Mirrors /me/is-superuser pattern.
       Returns the caller's own tier only — never leaked to other callers. */
    typed.get("/me/tier",
      {
        schema: {
          tags: ["Me"],
          summary: "My tier",
          description: "Returns { tier: string }. Session-authed; 401 if not signed in. The tier determines rate limits and LLM routing (EPIC B).",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: z.object({ tier: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;
        const tier = await getUserTier(userId);
        return reply.code(200).send({ tier });
      });

    /* AR-350 (epic AR-343): session-authed webhook subscription CRUD
       for the dashboard. Mirrors /v1/webhooks (api-key + rate-limit +
       plan-gated) but session-authed for /dashboard/webhooks users.
       All four handlers wrap the same module helpers as /v1/webhooks
       so the underlying CRUD + signing logic is single-source.
       Replaces the apps/web /api/me/webhooks family direct SQL. */
    typed.get("/me/webhooks",
      {
        schema: { tags: ["Me"], summary: "List my webhook subscriptions", description: "Returns the caller's webhook subscriptions (no secret).", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], response: { 200: ListWebhooksResponseSchema } },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;
        const subscriptions = await listWebhookSubscriptions(userId);
        return reply.code(200).send({ subscriptions });
      });

    typed.post("/me/webhooks",
      {
        schema: { tags: ["Me"], summary: "Create a webhook subscription", description: "Register a new webhook URL. Returns the signing secret ONCE.", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], body: z.object({ url: z.string(), events: z.array(z.string()) }), response: { 200: CreatedWebhookSchema, 201: CreatedWebhookSchema, 400: z.object({ error: z.string() }) } },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;

        const { url, events } = request.body;
        const urlCheck = validateWebhookUrl(url);
        if (!urlCheck.valid) {
          return reply.code(400).send({ error: urlCheck.error });
        }
        const eventList = validateEventTypes(events);
        if (!eventList) {
          return reply.code(400).send({ error: "events must be a non-empty array of supported types: 'signal.changed'" });
        }
        const created = await createWebhookSubscription(userId, urlCheck.sanitized, eventList);
        return reply.code(201).send(created);
      });

    typed.delete("/me/webhooks/:id",
      {
        schema: { tags: ["Me"], summary: "Delete a webhook subscription", description: "Revoke a webhook subscription owned by the caller.", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], params: IdParamsSchema, response: { 200: z.object({ ok: z.literal(true) }), 404: z.object({ error: z.string() }) } },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;
        const ok = await revokeWebhookSubscription(userId, request.params.id);
        if (!ok) return reply.code(404).send({ error: "Webhook not found" });
        return reply.code(200).send({ ok: true });
      });

    typed.post("/me/webhooks/:id/rotate-secret",
      {
        schema: { tags: ["Me"], summary: "Rotate webhook signing secret", description: "Generate a new HMAC signing secret. Returns it ONCE; the old secret is invalidated immediately.", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], params: IdParamsSchema, response: { 200: z.object({ secret: z.string() }), 404: z.object({ error: z.string() }) } },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;
        const secret = await rotateWebhookSecret(userId, request.params.id);
        if (!secret) return reply.code(404).send({ error: "Webhook not found" });
        return reply.code(200).send({ secret });
      });

    /* AR-349 (epic AR-343): dashboard-paginated portfolios for the
       caller. Session-authed. Different from /v1/portfolios (api-key
       authed, no pagination): this endpoint backs /dashboard with
       page + page_size + ?q search and inline-joins areas for the
       page rows. Replaces the apps/web /api/me/portfolios direct SQL. */
    typed.get("/me/portfolios",
      {
        schema: {
          tags: ["Me"],
          summary: "List my portfolios (paginated, searchable)",
          description: "Paginated portfolios for the caller. Query: ?page=1&page_size=20&q=<substring>. Inline-joins areas for the page rows.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          /* AR-548: see /me/activity — normalise bad paging, do not reject. */
          querystring: z.object({
            page: z.coerce.number().int().catch(1),
            page_size: z.coerce.number().int().catch(20),
            q: z.string().optional(),
          }),
          response: {
            200: MePortfoliosResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;

        const query = request.query;
        const DEFAULT_PAGE_SIZE = 20;
        const MAX_PAGE_SIZE = 100;

        const rawPage = query.page;
        const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
        const rawSize = query.page_size;
        const pageSize = Number.isFinite(rawSize)
          ? Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize))
          : DEFAULT_PAGE_SIZE;
        const q = (query.q ?? "").trim();
        const qLike = q ? `%${q}%` : null;
        const offset = (page - 1) * pageSize;

        try {
          const countRows = qLike
            ? await sql`SELECT COUNT(*)::int AS total FROM portfolios WHERE user_id = ${userId} AND name ILIKE ${qLike}`
            : await sql`SELECT COUNT(*)::int AS total FROM portfolios WHERE user_id = ${userId}`;
          const total = (countRows[0] as { total: number } | undefined)?.total ?? 0;

          const portfolios = qLike
            ? rows<{ id: string; name: string; created_at: string; updated_at: string }>(await sql`
                SELECT id, name, created_at, updated_at
                  FROM portfolios
                 WHERE user_id = ${userId}
                   AND name ILIKE ${qLike}
                 ORDER BY created_at DESC
                 LIMIT ${pageSize}
                OFFSET ${offset}
              `)
            : rows<{ id: string; name: string; created_at: string; updated_at: string }>(await sql`
                SELECT id, name, created_at, updated_at
                  FROM portfolios
                 WHERE user_id = ${userId}
                 ORDER BY created_at DESC
                 LIMIT ${pageSize}
                OFFSET ${offset}
              `);

          if (portfolios.length === 0) {
            return reply.code(200).send({ portfolios: [], total, page, page_size: pageSize });
          }

          const portfolioIds = portfolios.map((p) => p.id);
          const areas = rows<{ id: string; portfolio_id: string; area: string; label: string | null; created_at: string }>(await sql`
            SELECT id, portfolio_id, area, label, created_at
              FROM portfolio_areas
             WHERE portfolio_id = ANY(${portfolioIds})
             ORDER BY created_at ASC
          `);

          const areasByPortfolio: Record<string, typeof areas> = {};
          for (const a of areas) {
            (areasByPortfolio[a.portfolio_id] ||= []).push(a);
          }

          const out = portfolios.map((p) => ({
            id: p.id,
            name: p.name,
            created_at: p.created_at,
            updated_at: p.updated_at,
            area_count: (areasByPortfolio[p.id] ?? []).length,
            areas: (areasByPortfolio[p.id] ?? []).map((a) => ({ id: a.id, area: a.area, label: a.label })),
          }));

          return reply.code(200).send({ portfolios: out, total, page, page_size: pageSize });
        } catch (err) {
          logger.error("[me/portfolios] error:", err);
          return reply.code(200).send({ portfolios: [], total: 0, page, page_size: pageSize });
        }
      });

    /* AR-347 (epic AR-343): 30-day score-call breakdown for the
       caller, grouped by preset. Session-authed. Used by /dashboard/scores
       to show per-preset call counts. Replaces the apps/web
       /api/me/score-usage direct SQL. */
    typed.get("/me/score-usage",
      {
        schema: {
          tags: ["Me"],
          summary: "30-day score-call usage by preset",
          description: "Counts api.score.computed events over the last 30 days, grouped by preset.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: ScoreUsageResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;

        try {
          const usageRows = await sql`
            SELECT
              COALESCE(metadata->>'preset', metadata->>'preset_id', 'unknown') AS preset,
              COUNT(*)::int AS count
            FROM activity_events
            WHERE user_id = ${userId}
              AND event = 'api.score.computed'
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY preset
            ORDER BY count DESC
          `;
          const by_preset = (usageRows as Array<{ preset: string; count: number }>).map((r) => ({
            preset: r.preset,
            count: r.count,
          }));
          const total = by_preset.reduce((sum, r) => sum + r.count, 0);
          return reply.code(200).send({ window_days: 30, total, by_preset });
        } catch (err) {
          logger.error("[me/score-usage] error:", err);
          return reply.code(200).send({ window_days: 30, total: 0, by_preset: [] });
        }
      });

    /* AR-348 (epic AR-343): convenience accessor for the caller's
       primary org + their role in it. Session-authed. The "primary"
       org is owner-first, then oldest membership.

       Distinct from /v1/orgs/:id (which is api-key authed and requires
       the caller to know the org id). The /dashboard/org page needs
       BOTH the org and the caller's role; this endpoint returns both
       in one round trip rather than the dashboard having to compose
       /v1/orgs and a separate role lookup.

       Replaces the apps/web /api/me/org direct SQL. */
    typed.get("/me/org",
      {
        schema: {
          tags: ["Me"],
          summary: "Get my primary org + role",
          description: "Returns { org, caller_role } for the caller's primary org (owner-first, then oldest membership), or { org: null, caller_role: null } if the caller has no org.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: MeOrgResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;

        const memberships = (await sql`
          SELECT org_id, role
            FROM org_members
           WHERE user_id = ${userId}
           ORDER BY (role = 'owner') DESC, joined_at ASC
           LIMIT 1
        `) as Array<{ org_id: string; role: OrgRole }>;
        const primary = memberships[0];
        if (!primary) {
          return reply.code(200).send({ org: null, caller_role: null });
        }
        const org = await getOrgIfMember(primary.org_id, userId);
        if (!org) {
          /* org_members row points at a missing orgs row — invariant violation
             but handle cleanly rather than 500. */
          return reply.code(200).send({ org: null, caller_role: null });
        }
        return reply.code(200).send({ org, caller_role: primary.role });
      });

    typed.patch("/me/org",
      {
        schema: {
          tags: ["Me"],
          summary: "Update my primary org",
          description: "Partial update of the caller's primary org. Owner or admin only. Returns the updated org + caller_role.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          body: UpdateOrgRequestSchema,
          response: {
            200: UpdateMeOrgResponseSchema,
            403: z.object({ error: z.string(), code: z.string() }),
            404: z.object({ error: z.string() }),
            409: z.object({ error: z.string(), code: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;

        const memberships = (await sql`
          SELECT org_id, role
            FROM org_members
           WHERE user_id = ${userId}
           ORDER BY (role = 'owner') DESC, joined_at ASC
           LIMIT 1
        `) as Array<{ org_id: string; role: OrgRole }>;
        const primary = memberships[0];
        if (!primary) {
          return reply.code(404).send({ error: "No org" });
        }
        /* Re-check role via the same module helper /v1/orgs/:id uses, so
           the gate is identical across surfaces. */
        const role = await getRoleInOrg(primary.org_id, userId);
        if (!role || !hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }

        try {
          const updated = await updateOrg(primary.org_id, request.body);
          if (!updated) return reply.code(404).send({ error: "Org not found" });
          return reply.code(200).send({ org: updated, caller_role: role });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (/duplicate key|unique constraint/i.test(msg)) {
            return reply.code(409).send({ error: "Slug already in use. Pick a different slug.", code: "slug_in_use" });
          }
          throw err;
        }
      });

    /* AR-346 (epic AR-343): partial update of the caller's user profile.
       Session-authed. Today only `intent` is settable (the four-slug
       set from AR-218). Future profile fields slot in here.
       Replaces the apps/web /api/onboarding/complete inline UPDATE. */
    typed.patch("/me/profile",
      {
        schema: {
          tags: ["Me"],
          summary: "Update my profile",
          description: "Partial update of the caller's user profile. Today: `intent` only.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          /* AR-548: `.nullable()` as well as `.optional()`. The welcome flow is
             skippable and posts intents=null to mean "no change", which the
             handler already no-ops on; `.optional()` alone permits undefined
             but not null, so skipping onboarding returned a 400. */
          body: z.object({
            intents: z.array(z.string()).nullable().optional(),
          }),
          response: {
            200: z.object({ ok: z.literal(true) }),
            400: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply;

        const { intents } = request.body;
        const ALLOWED_INTENTS = new Set(["moving", "business", "investing", "research"]);

        if (intents !== undefined && intents !== null) {
          const validated: string[] = [];
          for (const slug of intents) {
            if (!ALLOWED_INTENTS.has(slug)) {
              return reply.code(400).send({ error: `Invalid intent slug: ${String(slug)}` });
            }
            if (!validated.includes(slug)) validated.push(slug);
          }
          /* Empty array = no-op (skippable per the /welcome flow). */
          if (validated.length > 0) {
            const intentCsv = validated.join(",");
            await sql`UPDATE users SET intent = ${intentCsv} WHERE id = ${userId}`;
          }
        }

        return reply.code(200).send({ ok: true });
      });

    typed.get("/v1/me",
      {
      schema: {
            "tags": [
                "Reports"
            ],
            "summary": "Current user profile",
            "description": "Returns the authenticated user's profile and usage stats.",
            "security": [{ "bearerAuth": [] }],
            response: {
              200: MeProfileResponseSchema,
              401: z.object({ error: z.string() }),
              403: z.object({ error: z.string(), code: z.string() }),
              429: z.object({ error: z.string() }),
            },
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
      /* AR-385: surface training_optout on /v1/me so the MCP server can
         log the customer's current capture state on every boot. Default
         FALSE (participate) when the field isn't present on the validated
         key — matches the runtime contract elsewhere. */
      const trainingOptout = result.trainingOptout ?? false;

      // Rate-limit /me at the shared per-key apiReport budget (MCP calls
      // it once at startup, but a misbehaving client could spam it).
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
        canMakeApiCall(userId),
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
        api_calls_per_month: planConfig?.apiCallsPerMonth ?? 0,
        used_this_month: usage.used,
        limit_this_month: usage.limit === Infinity ? null : usage.limit,
        // Canonical engine version from the methodology registry.
        engine_version: METHODOLOGY_VERSION,
        addons,
        mcp_calls_this_month: mcpUsed,
        // Levers AR-200: org branding + key allowlist (Enterprise polish).
        org: orgInfo,
        // AR-385: training_optout exposed so MCP server can show capture
        // state on boot. Customer toggles in /api-usage; effective on next call.
        key: { allowed_ip_cidrs: allowedIpCidrs, training_optout: trainingOptout },
      };
    });

    typed.get("/usage",
      {
        schema: {
          tags: ["Usage"],
          summary: "Check usage",
          description: "Check current API usage and limits.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: UsageCheckResponseSchema,
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply; // 401 already sent

        const usage = await canMakeApiCall(userId);
        return reply.send({ ...usage, limit: usage.limit === Infinity ? null : usage.limit });
      } catch (error) {
        logger.error("Usage check error:", error);
        return reply.code(500).send({ error: "Failed to check usage" });
      }
    });

    typed.get("/dashboard",
      {
        schema: {
          tags: ["Dashboard"],
          summary: "Dashboard data",
          description: "Composite dashboard data for the authenticated user.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: DashboardResponseSchema,
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply; // 401 already sent

        const [
          plan,
          used,
          mcpAccess,
          mcpAddonOwned,
          mcpUsage,
        ] = await Promise.all([
          getUserPlan(userId),
          getMonthlyApiCallCount(userId),
          hasMcpAccess(userId),
          hasAddon(userId, "mcp"),
          getMcpUsageThisMonth(userId),
        ]);

        const planConfig = PLANS[plan as PlanId];
        const planIncludesMcp = planConfig?.mcpAccess === true;

        // Primary API key (first non-revoked, created first).
        let primaryKey: { key_prefix: string | null; name: string; last_used_at: string | null } | null = null;
        try {
          const keyRows = rows<{ key_prefix: string | null; name: string; last_used_at: string | null }>(await sql`
            SELECT key_prefix, name, last_used_at
            FROM api_keys
            WHERE user_id = ${userId} AND revoked = FALSE
            ORDER BY created_at ASC
            LIMIT 1
          `);
          if (keyRows.length > 0) {
            primaryKey = keyRows[0];
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

        // AR-331 (epic AR-324): the legacy "Latest report call" widget read
        // from the now-dropped reports table. The dashboard restructure
        // (queued epic) replaces this with product-aware widgets. Until
        // then the field stays null; the consuming <LatestCallStrip>
        // renders nothing when null.
        const latestCall: { preset: string; area: string; score: number; created_at: string } | null = null;

        return reply.send({
          plan,
          planName: planConfig.name,
          used,
          limit: planConfig.apiCallsPerMonth,
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

    typed.get("/settings/subscription",
      {
        schema: {
          tags: ["Settings"],
          summary: "Subscription info",
          description: "Get current subscription plan and status.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          response: {
            200: SubscriptionInfoResponseSchema,
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
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
        if (sendAppError(reply, error)) return;
        return reply.code(500).send({ error: "Failed to fetch subscription info" });
      }
    });

    typed.post("/track",
      {
        schema: {
          tags: ["Tracking"],
          summary: "Track pageview",
          description: "Record a pageview event.",
          /* AR-548: `security: []` marks this operation explicitly public, the
             OpenAPI way to say "no auth". The handler performs no auth, so the
             previous `bearerToken` declaration mis-documented it and made the
             preValidation credential guard reject anonymous pageviews.

             `path` stays optional in the schema so a missing path reaches the
             handler and returns its documented `{ok:false}` body rather than a
             framework validation error. */
          security: [],
          body: z.object({
            path: z.string().nullish(),
            referrer: z.string().nullish(),
            sessionId: z.string().nullish(),
          }),
          response: {
            200: z.object({ ok: z.literal(true) }),
            400: z.union([
              z.object({ ok: z.literal(false) }),
              z.object({ statusCode: z.number(), error: z.string(), message: z.string() }),
            ]),
          },
        },
      },
      async (request, reply) => {
      try {
        const { path, referrer, sessionId } = request.body;
        if (!path) {
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

    typed.get("/watchlist", {
      schema: { tags: ["Watchlist"], summary: "Get watchlist", description: "Get the authenticated user's saved areas watchlist.", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], response: { 200: WatchlistResponseSchema, 500: z.object({ error: z.string() }) } },
    }, async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply; // 401 already sent

        const areas = rows<SavedAreaRow>(await sql`
          SELECT id, postcode, label, intent, created_at
          FROM saved_areas
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `);
        return reply.send({ areas });
      } catch (error) {
        logger.error("Watchlist fetch error:", error);
        return reply.code(500).send({ error: "Failed to fetch watchlist" });
      }
    });

    typed.post("/watchlist", {
      schema: { tags: ["Watchlist"], summary: "Add to watchlist", description: "Add an area to the user's watchlist.", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], body: z.object({ postcode: z.string(), label: z.string().optional(), intent: z.string().optional() }), response: { 201: AddToWatchlistResponseSchema, 409: z.object({ error: z.string() }), 500: z.object({ error: z.string() }) } },
    }, async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
        if (!userId) return reply; // 401 already sent

        const { postcode: rawPostcode, label: rawLabel, intent: rawIntent } = request.body;
        const postcode = rawPostcode.trim().toUpperCase();
        const label = (rawLabel ?? "").trim();
        const intent = rawIntent || null;

        const result = rows<SavedAreaRow>(await sql`
          INSERT INTO saved_areas (user_id, postcode, label, intent)
          VALUES (${userId}, ${postcode}, ${label}, ${intent})
          ON CONFLICT (user_id, postcode) DO NOTHING
          RETURNING id, postcode, label, intent, created_at
        `);
        if (result.length === 0) {
          return reply.code(409).send({ error: "Area already saved" });
        }
        return reply.code(201).send({ area: result[0] });
      } catch (error) {
        logger.error("Watchlist add error:", error);
        return reply.code(500).send({ error: "Failed to save area" });
      }
    });

    typed.delete("/watchlist/:id", {
      schema: { tags: ["Watchlist"], summary: "Remove from watchlist", description: "Remove an area from the user's watchlist.", security: [{ "bearerToken": [] }, { "bearerAuth": [] }], params: IdParamsSchema, response: { 200: z.object({ ok: z.literal(true) }), 404: z.object({ error: z.string() }), 500: z.object({ error: z.string() }) } },
    }, async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
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
}
