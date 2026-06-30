import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../shared/auth-api";
import { authenticateSession } from "../shared/auth-session";
import { headerString, clientIpOf } from "../shared/http";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { rows, row, type ReportRow, type SubscriptionRow, type ApiKeyRow, type ActivityEventRow } from "../infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS } from "../infrastructure/config";
import { validateApiKey } from "../modules/api-keys";
import { getUserPlan, hasApiAccess, hasMcpAccess, canMakeApiCall, listAddons, getMcpUsageThisMonth, isSuperuser } from "../modules/usage";
import { PLANS } from "../modules/billing/plans";
import { METHODOLOGY_VERSION } from "../modules/engine/methodology";
import { listForUser as listActivityForUser } from "../modules/activity";
import { trackEvent } from "../modules/tracking/activity";
import { generateId } from "../infrastructure/utils/id";

import { getMonthlyApiCallCount, hasAddon } from "../modules/usage";
import { asSubscription } from "../modules/billing/stripe-types";
import { stripe } from "../modules/billing/stripe-client";
import type { Country } from "../modules/signals/peers";
import type { PlanId } from "../modules/billing/plans";
import { getOrgIfMember, getRoleInOrg, updateOrg, hasAtLeastRole } from "../modules/orgs";
import { UpdateOrgRequestSchema, type OrgRole } from "@onegoodarea/contracts";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  revokeWebhookSubscription,
  rotateWebhookSecret,
  validateWebhookUrl,
  validateEventTypes,
} from "../modules/webhooks";
/** me route handlers — extracted from app.ts per AR-286. */
export function registerMeRoutes(app: FastifyInstance): void {
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

    /* AR-350 (epic AR-343): session-authed webhook subscription CRUD
       for the dashboard. Mirrors /v1/webhooks (api-key + rate-limit +
       plan-gated) but session-authed for /dashboard/webhooks users.
       All four handlers wrap the same module helpers as /v1/webhooks
       so the underlying CRUD + signing logic is single-source.
       Replaces the apps/web /api/me/webhooks family direct SQL. */
    app.get("/me/webhooks",
      {
        schema: { tags: ["Me"], summary: "List my webhook subscriptions", description: "Returns the caller's webhook subscriptions (no secret)." },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;
        const subscriptions = await listWebhookSubscriptions(userId);
        return reply.code(200).send({ subscriptions });
      });

    app.post("/me/webhooks",
      {
        schema: { tags: ["Me"], summary: "Create a webhook subscription", description: "Register a new webhook URL. Returns the signing secret ONCE." },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;

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
          return reply.code(400).send({ error: "events must be a non-empty array of supported types: 'signal.changed'" });
        }
        const created = await createWebhookSubscription(userId, urlCheck.sanitized, eventList);
        return reply.code(201).send(created);
      });

    app.delete<{ Params: { id: string } }>("/me/webhooks/:id",
      {
        schema: { tags: ["Me"], summary: "Delete a webhook subscription", description: "Revoke a webhook subscription owned by the caller." },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;
        const ok = await revokeWebhookSubscription(userId, request.params.id);
        if (!ok) return reply.code(404).send({ error: "Webhook not found" });
        return reply.code(200).send({ ok: true });
      });

    app.post<{ Params: { id: string } }>("/me/webhooks/:id/rotate-secret",
      {
        schema: { tags: ["Me"], summary: "Rotate webhook signing secret", description: "Generate a new HMAC signing secret. Returns it ONCE; the old secret is invalidated immediately." },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
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
    app.get("/me/portfolios",
      {
        schema: {
          tags: ["Me"],
          summary: "List my portfolios (paginated, searchable)",
          description: "Paginated portfolios for the caller. Query: ?page=1&page_size=20&q=<substring>. Inline-joins areas for the page rows.",
        },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;

        const query = (request.query ?? {}) as { page?: string; page_size?: string; q?: string };
        const DEFAULT_PAGE_SIZE = 20;
        const MAX_PAGE_SIZE = 100;

        const rawPage = Number.parseInt(query.page ?? "1", 10);
        const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
        const rawSize = Number.parseInt(query.page_size ?? String(DEFAULT_PAGE_SIZE), 10);
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
            ? await sql`
                SELECT id, name, created_at, updated_at
                  FROM portfolios
                 WHERE user_id = ${userId}
                   AND name ILIKE ${qLike}
                 ORDER BY created_at DESC
                 LIMIT ${pageSize}
                OFFSET ${offset}
              `
            : await sql`
                SELECT id, name, created_at, updated_at
                  FROM portfolios
                 WHERE user_id = ${userId}
                 ORDER BY created_at DESC
                 LIMIT ${pageSize}
                OFFSET ${offset}
              `;

          if (portfolios.length === 0) {
            return reply.code(200).send({ portfolios: [], total, page, page_size: pageSize });
          }

          const portfolioIds = (portfolios as Array<{ id: string }>).map((p) => p.id);
          const areas = (await sql`
            SELECT id, portfolio_id, area, label, created_at
              FROM portfolio_areas
             WHERE portfolio_id = ANY(${portfolioIds})
             ORDER BY created_at ASC
          `) as Array<{ id: string; portfolio_id: string; area: string; label: string | null; created_at: string }>;

          const areasByPortfolio: Record<string, typeof areas> = {};
          for (const a of areas) {
            (areasByPortfolio[a.portfolio_id] ||= []).push(a);
          }

          const out = (portfolios as Array<{ id: string; name: string; created_at: string; updated_at: string }>).map((p) => ({
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
    app.get("/me/score-usage",
      {
        schema: {
          tags: ["Me"],
          summary: "30-day score-call usage by preset",
          description: "Counts api.score.computed events over the last 30 days, grouped by preset.",
        },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
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
    app.get("/me/org",
      {
        schema: {
          tags: ["Me"],
          summary: "Get my primary org + role",
          description: "Returns { org, caller_role } for the caller's primary org (owner-first, then oldest membership), or { org: null, caller_role: null } if the caller has no org.",
        },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
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

    app.patch("/me/org",
      {
        schema: {
          tags: ["Me"],
          summary: "Update my primary org",
          description: "Partial update of the caller's primary org. Owner or admin only. Returns the updated org + caller_role.",
        },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
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

        const parsed = UpdateOrgRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }

        try {
          const updated = await updateOrg(primary.org_id, parsed.data);
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
    app.patch("/me/profile",
      {
        schema: {
          tags: ["Me"],
          summary: "Update my profile",
          description: "Partial update of the caller's user profile. Today: `intent` only.",
        },
      },
      async (request, reply) => {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply;

        const body = (request.body ?? {}) as { intents?: unknown };
        const ALLOWED_INTENTS = new Set(["moving", "business", "investing", "research"]);

        if (body.intents !== undefined && body.intents !== null) {
          if (!Array.isArray(body.intents)) {
            return reply.code(400).send({ error: "intents must be an array." });
          }
          const validated: string[] = [];
          for (const slug of body.intents) {
            if (typeof slug !== "string" || !ALLOWED_INTENTS.has(slug)) {
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
        // Canonical engine version (the legacy route hardcoded a now-stale "2.0.0").
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

    app.get("/usage", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        const usage = await canMakeApiCall(userId);
        return reply.send(usage);
      } catch (error) {
        logger.error("Usage check error:", error);
        return reply.code(500).send({ error: "Failed to check usage" });
      }
    });

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
}
