import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { isIntent } from "@onegoodarea/contracts";
import { requireApiAccess, requireApiAccessWithOrg } from "../shared/auth-api";
import { effectiveEngineVersionForCaller } from "../shared/bundles";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getConfig } from "../infrastructure/config";
import { createPortfolio, listPortfolios, getPortfolio, deletePortfolio, addAreas, enrichPortfolio, detectPortfolioChanges, PORTFOLIO_ADD_MAX, type Baseline } from "../modules/monitor";
import { trackEvent } from "../modules/tracking/activity";

import type { Intent } from "@onegoodarea/contracts";
/** portfolios route handlers — extracted from app.ts per AR-286. */
export function registerPortfoliosRoutes(app: FastifyInstance): void {
  const guardSignals = async (request: FastifyRequest, reply: FastifyReply): Promise<string | null> => {
    if (!getConfig().signalsApiEnabled) { reply.code(404).send({ error: "Not found" }); return null; }
    return requireApiAccess(request, reply);
  };

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
        /* AR-386: return the full PortfolioDetail alongside the count so the
           MCP watch_portfolio tool (and any other batch-add caller) can
           render the resulting state without a second round-trip. Additive —
           `added` stays for back-compat. */
        const portfolio = await getPortfolio(userId, id);
        return reply.code(200).send({ added: result.added, portfolio });
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
}
