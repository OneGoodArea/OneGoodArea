import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { isIntent } from "@onegoodarea/contracts";
import { requireApiAccessWithOrg, requireApiAccess } from "../shared/auth-api";
import { headerString } from "../shared/http";
import { resolveBundleForCaller, effectiveEngineVersionForCaller } from "../shared/bundles";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { rows } from "../infrastructure/db/types";
import { rateLimit, rateLimitHeaders } from "../infrastructure/rate-limit";
import { RATE_LIMITS, getConfig, BATCH_MAX_ITEMS } from "../infrastructure/config";
import { scoreArea, parseScoreBody } from "../modules/scoring";
import { getPreset } from "../modules/orgs/presets";
import { isSuccess, processBatchItems, type BatchItem, isBatchItemArray } from "../modules/reports/batch";
import { trackEvent } from "../modules/tracking/activity";

import { validateApiKey } from "../modules/api-keys";
import { clientIpOf } from "../shared/http";
import { parseIdempotencyKey, withIdempotency } from "../infrastructure/idempotency";
import { canGenerateReport, hasApiAccess } from "../modules/usage";
import { resolveEngineVersion } from "../modules/reports/engine-version";
import type { Intent } from "@onegoodarea/contracts";
/** scoring route handlers — extracted from app.ts per AR-286. */
export function registerScoringRoutes(app: FastifyInstance): void {
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
}
