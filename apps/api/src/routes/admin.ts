import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateSessionOrApiKey } from "../shared/auth-session";
import { logger } from "../modules/tracking/structured-logger";
import { isSuperuser } from "../modules/usage";
import { getAnalytics, getTrafficAnalytics, getAudienceStats, getUsageStats, getRevenueExtras, getMcpAdoption, getTrainingCorpusStats } from "../modules/admin";
import {
  AdminAnalyticsResponseSchema,
  AdminTrafficAnalyticsResponseSchema,
  AdminAudienceResponseSchema,
  AdminUsageResponseSchema,
  AdminRevenueResponseSchema,
  AdminMcpAdoptionResponseSchema,
  AdminTrainingCorpusResponseSchema,
} from "@onegoodarea/contracts";

/** admin route handlers — extracted from app.ts per AR-286. */
export function registerAdminRoutes(app: FastifyInstance): void {
    app.get("/admin/analytics",
      {
        schema: {
          tags: ["Admin"],
          summary: "Analytics overview",
          description: "High-level admin analytics.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminAnalyticsResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
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

    app.get("/admin/traffic-analytics",
      {
        schema: {
          tags: ["Admin"],
          summary: "Traffic analytics",
          description: "Traffic analytics data.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminTrafficAnalyticsResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
            503: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
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

    /* AR-313 Phase 1: composite "who's here" stats. Total/active users,
       signup curve over 12mo, org count by size bucket, avg/median/p90
       org activity, geo breakdown. */
    app.get("/admin/audience",
      {
        schema: {
          tags: ["Admin"],
          summary: "Audience stats (superuser only)",
          description: "Composite stats for the Audience tab: total/active users, signup curve, orgs by size + activity, top countries, churn signal.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminAudienceResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        try {
          const userId = await authenticateSessionOrApiKey(request, reply);
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
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminUsageResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        try {
          const userId = await authenticateSessionOrApiKey(request, reply);
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

    /* AR-313 Phase 3: revenue-specific extras (ARR, MCP add-on uptake).
       The existing /admin/analytics keeps providing MRR + plan
       distribution + funnel base counts. */
    app.get("/admin/revenue",
      {
        schema: {
          tags: ["Admin"],
          summary: "Revenue extras (superuser only)",
          description: "ARR + MCP add-on uptake + active add-on counts.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminRevenueResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        try {
          const userId = await authenticateSessionOrApiKey(request, reply);
          if (!userId) return reply;
          if (!(await isSuperuser(userId))) {
            return reply.code(403).send({ error: "Forbidden" });
          }
          const data = await getRevenueExtras();
          return reply.send(data);
        } catch (error) {
          logger.error("Admin revenue extras error:", error);
          return reply.code(500).send({ error: "Failed to fetch revenue extras" });
        }
      });

    /* AR-375: MCP adoption tile for the /admin Usage tab. Reads the
       mcp_adoption view (source=mcp, last 30d) and returns aggregate
       counts. Raw event metadata is NEVER surfaced here — admin tile
       privacy default per plan 029. */
    app.get("/admin/mcp-adoption",
      {
        schema: {
          tags: ["Admin"],
          summary: "MCP adoption stats (superuser only)",
          description: "Aggregate MCP usage last 30 days: total events, unique orgs/users, top orgs, breakdown by client app. No raw metadata.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminMcpAdoptionResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        try {
          const userId = await authenticateSessionOrApiKey(request, reply);
          if (!userId) return reply;
          if (!(await isSuperuser(userId))) {
            return reply.code(403).send({ error: "Forbidden" });
          }
          const data = await getMcpAdoption();
          return reply.send(data);
        } catch (error) {
          logger.error("Admin MCP adoption error:", error);
          return reply.code(500).send({ error: "Failed to fetch MCP adoption" });
        }
      });

    /* AR-376: training-corpus stats for the /admin Usage tab. Aggregate
       counts only — never raw question text or plan content. */
    app.get("/admin/training-corpus",
      {
        schema: {
          tags: ["Admin"],
          summary: "Training corpus stats (superuser only)",
          description: "Aggregate planner-pair counts (30d + total + last_seen) plus opt-out denominator over active API keys. No raw training data.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          response: {
            200: AdminTrainingCorpusResponseSchema,
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        try {
          const userId = await authenticateSessionOrApiKey(request, reply);
          if (!userId) return reply;
          if (!(await isSuperuser(userId))) {
            return reply.code(403).send({ error: "Forbidden" });
          }
          const data = await getTrainingCorpusStats();
          return reply.send(data);
        } catch (error) {
          logger.error("Admin training corpus error:", error);
          return reply.code(500).send({ error: "Failed to fetch training corpus stats" });
        }
      });

    /* AR-500 (Plan 045): superuser-only endpoint to set a user's tier.
       Validates against the allowed tier taxonomy. Self-signup never touches
       this endpoint — the tier column defaults to 'basic' on INSERT. */
    app.post("/admin/users/:id/tier",
      {
        schema: {
          tags: ["Admin"],
          summary: "Set user tier (superuser only)",
          description: "Privileged endpoint to set a user's tier. Validates against allowed values.",
          security: [{ "bearerToken": [] }, { "bearerAuth": [] }],
          "x-internal": true,
          params: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
          },
          body: {
            type: "object",
            properties: { tier: { type: "string", enum: ["anonymous", "logged_in", "basic", "high_tier", "engineering", "superuser"] } },
            required: ["tier"],
          },
          response: {
            200: z.object({ ok: z.literal(true), tier: z.string() }),
            400: z.object({ error: z.string() }),
            403: z.object({ error: z.string(), code: z.string().optional() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
        try {
          const userId = await authenticateSessionOrApiKey(request, reply);
          if (!userId) return reply;
          if (!(await isSuperuser(userId))) {
            return reply.code(403).send({ error: "Forbidden" });
          }

          const { id } = request.params as { id: string };
          const { tier } = (request.body ?? {}) as { tier?: string };

          if (!tier || !["anonymous", "logged_in", "basic", "high_tier", "engineering", "superuser"].includes(tier)) {
            return reply.code(400).send({ error: "Invalid tier. Must be one of: anonymous, logged_in, basic, high_tier, engineering, superuser" });
          }

          const { setUserTier } = await import("../modules/usage");
          await setUserTier(id, tier as "anonymous" | "logged_in" | "basic" | "high_tier" | "engineering" | "superuser");

          return reply.send({ ok: true, tier });
        } catch (error) {
          logger.error("Admin set tier error:", error);
          return reply.code(500).send({ error: "Failed to set user tier" });
        }
      });
}
