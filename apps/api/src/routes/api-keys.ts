import type { FastifyInstance } from "fastify";
import { authenticateSession } from "../shared/auth-session";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { rows, row, type ApiKeyRow, type ActivityEventRow } from "../infrastructure/db/types";
import { createApiKey, listApiKeys, revokeApiKey } from "../modules/api-keys";
import { hasApiAccess, getUserPlan } from "../modules/usage";
import { PLANS, type PlanId } from "../modules/billing/plans";

interface CountRow { count: number; }
interface DayCountRow { day: string; count: number; }
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & { key_preview: string };

export function registerApiKeysRoutes(app: FastifyInstance): void {
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

    /* AR-289: optional ?org=<id> filter. When set, the four stat queries
       restrict to activity_events tagged with that org. Validate the
       caller is a member of that org first — 403 on cross-org attempts.
       The api_keys list stays user-scoped (keys belong to a user). */
    const queryOrg = (request.query as { org?: unknown })?.org;
    const orgFilter = typeof queryOrg === "string" && queryOrg.length > 0 ? queryOrg : null;
    if (orgFilter) {
      const membership = await sql`
        SELECT 1 FROM org_members
         WHERE org_id = ${orgFilter} AND user_id = ${userId}
         LIMIT 1
      `;
      if (membership.length === 0) {
        return reply.code(403).send({ error: "You are not a member of that organisation." });
      }
    }

    try {
      /* AR-306: count ALL api.* events (api.report.generated, api.me.read,
         api.score.scored, api.batch.processed, api.query.executed, etc.)
         not just /v1/report. Without this the dashboard chart undercounts
         by a wide margin once a user touches anything but /v1/report.
         Re-applies the AR-287 fix that was lost when web's /api/keys/usage
         BFF became a thin proxy in PR #197 (Plan 010).

         AR-289: when orgFilter is set, AND org_id = ${orgFilter} is
         appended to the four stat queries. orgFilter null → no extra
         predicate → existing (user-wide) behaviour. */
      const [totalRequests, requestsThisMonth, requestsByDay, lastRequest, apiKeys] = await Promise.all([
        orgFilter
          ? sql`
              SELECT COUNT(*)::int as count
              FROM activity_events
              WHERE user_id = ${userId} AND event LIKE 'api.%' AND org_id = ${orgFilter}
            `
          : sql`
              SELECT COUNT(*)::int as count
              FROM activity_events
              WHERE user_id = ${userId} AND event LIKE 'api.%'
            `,
        orgFilter
          ? sql`
              SELECT COUNT(*)::int as count
              FROM activity_events
              WHERE user_id = ${userId}
                AND event LIKE 'api.%'
                AND org_id = ${orgFilter}
                AND created_at >= date_trunc('month', NOW())
            `
          : sql`
              SELECT COUNT(*)::int as count
              FROM activity_events
              WHERE user_id = ${userId}
                AND event LIKE 'api.%'
                AND created_at >= date_trunc('month', NOW())
            `,
        orgFilter
          ? sql`
              SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
              FROM activity_events
              WHERE user_id = ${userId}
                AND event LIKE 'api.%'
                AND org_id = ${orgFilter}
                AND created_at >= NOW() - INTERVAL '30 days'
              GROUP BY day
              ORDER BY day
            `
          : sql`
              SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
              FROM activity_events
              WHERE user_id = ${userId}
                AND event LIKE 'api.%'
                AND created_at >= NOW() - INTERVAL '30 days'
              GROUP BY day
              ORDER BY day
            `,
        orgFilter
          ? sql`
              SELECT created_at
              FROM activity_events
              WHERE user_id = ${userId} AND event LIKE 'api.%' AND org_id = ${orgFilter}
              ORDER BY created_at DESC
              LIMIT 1
            `
          : sql`
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
        monthlyLimit: PLANS[plan as PlanId]?.apiCallsPerMonth ?? 100,
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
}
