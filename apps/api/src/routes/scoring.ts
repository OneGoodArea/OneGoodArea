import type { FastifyInstance } from "fastify";
import { requireApiAccessWithOrg } from "../shared/auth-api";
import { resolveBundleForCaller, effectiveEngineVersionForCaller } from "../shared/bundles";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { rows } from "../infrastructure/db/types";
import { getConfig } from "../infrastructure/config";
import { scoreArea, parseScoreBody } from "../modules/scoring";
import { getPreset } from "../modules/orgs/presets";
import { trackEvent } from "../modules/tracking/activity";
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
        const rawQuery = (request.query ?? {}) as { bundle?: unknown; explain?: unknown };
        const rawBody = (request.body ?? {}) as { bundle?: unknown };
        const bundleId =
          typeof rawQuery.bundle === "string" ? rawQuery.bundle :
          typeof rawBody.bundle === "string" ? rawBody.bundle : undefined;
        const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
        if (!resolved.ok) return reply;
        if (resolved.allowed) {
          parsed.query.bundle_allowed_keys = resolved.allowed;
        }

        // AR-363: `?explain=true` is the canonical wire format. Body-level
        // `explain: true` is already parsed by parseScoreBody; query takes
        // precedence (a query toggle is more discoverable for MCP-style
        // callers and matches the bundle precedent).
        if (rawQuery.explain !== undefined) {
          if (rawQuery.explain === "true" || rawQuery.explain === true) {
            parsed.query.explain = true;
          } else if (rawQuery.explain === "false" || rawQuery.explain === false) {
            parsed.query.explain = false;
          } else {
            return reply.code(400).send({ error: "explain query param must be 'true' or 'false'." });
          }
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
}
