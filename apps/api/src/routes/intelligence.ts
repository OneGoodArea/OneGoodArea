import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireApiAccessWithOrg } from "../shared/auth-api";
import { headerString } from "../shared/http";
import { effectiveEngineVersionForCaller } from "../shared/bundles";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getConfig } from "../infrastructure/config";
import { validateLocationInput } from "../infrastructure/validation/validator";
import { runQuery, parseQueryRequest, AmbiguousLocationError } from "../modules/intelligence";
import { findPeers, parsePeersInput, PEERS_DEFAULT_K, PEERS_DEFAULT_MIN_SIGNALS, type Country as PeersCountry } from "../modules/signals/peers";
import { findInsights, parseInsightsInput, INSIGHTS_DEFAULT_K } from "../modules/signals/insights";
import { runForecast, parseForecastInput, FORECAST_DEFAULT_WINDOW, FORECAST_DEFAULT_HORIZON } from "../modules/signals/forecast";
import { trackEvent } from "../modules/tracking/activity";
import { insertPlannerLog } from "../modules/training/planner-logs";

import { resolveBundleForCaller } from "../shared/bundles";
import { planSignalsOutsideBundle } from "../modules/orgs/bundles";
import { geocodeArea } from "../modules/signals/data-sources/postcodes";
import { rows } from "../infrastructure/db/types";
import { sql } from "../infrastructure/db/client";
import { getCohort } from "../modules/orgs/cohorts";
import { METHODOLOGY_VERSION } from "../modules/engine/methodology";
import type { Country } from "../modules/signals/peers";
/** intelligence route handlers — extracted from app.ts per AR-286. */
export function registerIntelligenceRoutes(app: FastifyInstance): void {
  const guardSignalsCtx = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<{ userId: string; orgId: string | null } | null> => {
    if (!getConfig().signalsApiEnabled) { reply.code(404).send({ error: "Not found" }); return null; }
    return requireApiAccessWithOrg(request, reply);
  };

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

        /* AR-376: capture the NL question for planner training (only
           when the caller actually sent a question — programmatic
           {plan} calls aren't training data). Latency is measured
           around runQuery; the insert happens AFTER the response is
           sent so it never adds to user-visible time. */
        const trainingQuestion: string | null =
          "question" in parsed.req && typeof parsed.req.question === "string"
            ? parsed.req.question
            : null;
        const t0 = Date.now();

        let result: Awaited<ReturnType<typeof runQuery>>;
        try {
          result = await runQuery(parsed.req);
        } catch (err) {
          // AR-267: typed surface for ambiguous place names. Don't 500 —
          // tell the caller which candidates to disambiguate between.
          if (err instanceof AmbiguousLocationError) {
            if (trainingQuestion !== null) {
              insertPlannerLog(
                {
                  userId: ctx.userId,
                  orgId: ctx.orgId,
                  question: trainingQuestion,
                  plan: { error: "ambiguous_location", query: err.query },
                  planSource: null,
                  responseOk: false,
                  errorCode: "ambiguous_location",
                  latencyMs: Date.now() - t0,
                },
                ctx.trainingOptout,
              );
            }
            return reply.code(422).send({
              error: `Place name "${err.query}" is ambiguous. Choose a specific candidate or re-ask with a postcode.`,
              code: "ambiguous_location",
              candidates: err.candidates,
            });
          }
          throw err;
        }
        const latencyMs = Date.now() - t0;
        if (!result.ok) {
          if (trainingQuestion !== null) {
            insertPlannerLog(
              {
                userId: ctx.userId,
                orgId: ctx.orgId,
                question: trainingQuestion,
                plan: { error: result.error.code, raw: result.error.raw },
                planSource: null,
                responseOk: false,
                errorCode: result.error.code,
                latencyMs,
              },
              ctx.trainingOptout,
            );
          }
          return reply.code(422).send({ error: result.error.message, code: result.error.code, raw: result.error.raw });
        }
        if (resolved.allowed) {
          const outside = planSignalsOutsideBundle(result.response.plan, resolved.allowed);
          if (outside.length > 0) {
            if (trainingQuestion !== null) {
              insertPlannerLog(
                {
                  userId: ctx.userId,
                  orgId: ctx.orgId,
                  question: trainingQuestion,
                  plan: result.response.plan,
                  planSource: result.response.plan_source,
                  responseOk: false,
                  errorCode: "bundle_signal_not_allowed",
                  latencyMs,
                },
                ctx.trainingOptout,
              );
            }
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
        if (trainingQuestion !== null) {
          insertPlannerLog(
            {
              userId: ctx.userId,
              orgId: ctx.orgId,
              question: trainingQuestion,
              plan: result.response.plan,
              planSource: result.response.plan_source,
              responseOk: true,
              errorCode: null,
              latencyMs,
            },
            ctx.trainingOptout,
          );
        }
        reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId));
        return reply.code(200).send(result.response);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/query] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

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
          return reply.code(400).send({ error: "Missing 'target' object. Provide as nested: {target: {geo_code: \"E01...\"}} OR {target: {postcode: \"M1 1AE\"}} OR {target: {area: \"Manchester\"}}." });
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
          return reply.code(400).send({ error: "Missing 'target' object. Provide as nested: {target: {geo_code: \"E01...\"}} OR {target: {postcode: \"M1 1AE\"}} OR {target: {area: \"Manchester\"}}." });
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
}
