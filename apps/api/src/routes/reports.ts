import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate, requireApiAccessWithOrg } from "../shared/auth-api";
import { authenticateSession } from "../shared/auth-session";
import { headerString, clientIpOf, isFromMcpServer } from "../shared/http";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { rows, type ReportRow } from "../infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS, getConfig } from "../infrastructure/config";
import { validateApiKey } from "../modules/api-keys";
import { hasApiAccess, hasMcpAccess, canGenerateReport, trackMcpCall } from "../modules/usage";
import { resolveEngineVersion } from "../modules/engine/version";
import { generateReport } from "../modules/reports/report-generator";
import { validateLocationInput, validateIntent } from "../infrastructure/validation/validator";
import { parseIdempotencyKey, withIdempotency } from "../infrastructure/idempotency";
import { trackEvent } from "../modules/tracking/activity";

import { getUserEmail } from "../modules/usage";
import { sendReportEmail } from "../infrastructure/email/senders";
import type { Intent } from "@onegoodarea/contracts";
/** reports route handlers — extracted from app.ts per AR-286. */
export function registerReportsRoutes(app: FastifyInstance): void {
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
        /* AR-289: capture the api key's org for the activity_events tag.
           Closures below shadow `result` (idempotency wraps generateReport's
           result), so bind to a uniquely-named local. */
        const apiKeyOrgId = result.orgId ?? null;

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
            trackEvent("api.report.generated", userId, { area: body.area, intent, reportId: result.id, source: fromMcp ? "mcp" : "api" }, apiKeyOrgId);
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
}
