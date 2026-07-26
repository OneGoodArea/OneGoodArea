import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireApiAccessWithOrg, requireApiAccessWithOrgOrAnonymous } from "../shared/auth-api";
import { canMakeNlCall } from "../modules/usage";
import { PLANS } from "../modules/billing/plans";
import { effectiveEngineVersionForCaller } from "../shared/bundles";
import { sendAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getConfig } from "../infrastructure/config";

import { runQuery, parseQueryRequest, AmbiguousLocationError } from "../modules/intelligence";
import { findPeers, parsePeersInput } from "../modules/signals/peers";
import { findInsights, parseInsightsInput } from "../modules/signals/insights";
import { runForecast, parseForecastInput } from "../modules/signals/forecast";
import { trackEvent } from "../modules/tracking/activity";
import { insertPlannerLog } from "../modules/training/planner-logs";

import { resolveBundleForCaller } from "../shared/bundles";
import { planSignalsOutsideBundle } from "../modules/orgs/bundles";
import { geocodeArea } from "../modules/signals/data-sources/postcodes";
import { rows } from "../infrastructure/db/types";
import { sql } from "../infrastructure/db/client";
import { getCohort } from "../modules/orgs/cohorts";
import { METHODOLOGY_VERSION } from "../modules/engine/methodology";
import { z } from "zod";
import {
  PeersResponseSchema,
  InsightsResponseSchema,
  ForecastResponseSchema,
} from "@onegoodarea/contracts";
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
            "description": "Run a query plan or natural-language question against the intelligence moat. Supports rank_areas, get_area, score_area, compare_areas, find_peers, find_insights, and find_forecast. Callable without an API key at the anonymous tier's quota (AR-594, Plan 059.2).",
            "security": [{ "bearerAuth": [] }, {}],
            "body": {
              "oneOf": [
                { "type": "object", "properties": { "question": { "type": "string", "minLength": 1 } }, "required": ["question"], "description": "Natural language question.", "example": { "question": "best areas for families in London" } },
                { "type": "object", "properties": { "plan": { "type": "object" } }, "required": ["plan"], "description": "Programmatic plan object." },
              ],
              "description": "Natural language question or a programmatic plan object.",
            },
            "querystring": { "type": "object", "properties": { "bundle": { "type": "string", "description": "Optional bundle ID to scope available signals." } } },
            response: {
              200: z.object({
                plan: z.record(z.string(), z.unknown()),
                plan_source: z.enum(["client", "nl"]),
                results: z.union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown()), z.null()]).optional(),
                meta: z.object({ generated_at: z.string() }).optional(),
              }),
              400: z.object({ error: z.string() }),
              404: z.object({ error: z.string() }),
              422: z.object({
                error: z.string(),
                code: z.string(),
                raw: z.string().optional(),
                candidates: z.array(z.object({ label: z.string(), postcode: z.string(), district: z.string(), country: z.string() }).strict()).optional(),
              }),
              429: z.object({ error: z.string(), code: z.string() }),
              500: z.object({ error: z.string() }),
            },
        },
      }, async (request, reply) => {
      try {
        if (!getConfig().signalsApiEnabled) {
          return reply.code(404).send({ error: "Not found" });
        }
        const ctx = await requireApiAccessWithOrgOrAnonymous(request, reply);
        if (!ctx) return reply;
        const parsed = parseQueryRequest(request.body);
        if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

        /* AR-488: the NL path invokes the Anthropic-backed planner (real
           marginal cost). Enforce the per-plan monthly NL sub-cap before we
           touch the LLM. Programmatic {plan} calls carry no `question` and
           are unaffected. Anonymous callers (AR-594, Plan 059.2) have no
           plan to sub-cap — their tier quota (checked inside
           requireApiAccessWithOrgOrAnonymous, including the AR-593 global
           free-tier backstop) is the only limiter that applies to them. */
        const isNlCall =
          "question" in parsed.req &&
          typeof (parsed.req as { question?: unknown }).question === "string";
        if (isNlCall && ctx.userId) {
          const nlQuota = await canMakeNlCall(ctx.userId);
          if (!nlQuota.allowed) {
            return reply.code(429).send({
              error: `Monthly natural-language query limit reached (${nlQuota.limit} on the ${PLANS[nlQuota.plan].name} plan). Programmatic plan queries are not affected. Upgrade at /pricing.`,
              code: "nl_quota_exceeded",
            });
          }
        }

        // Levers (AR-195): if ?bundle= or body.bundle is set, resolve the
        // bundle's whitelist for the caller's org. The plan is then
        // gated AFTER planning — the executed plan (whether programmatic
        // or NL-derived) must only reference signals in the bundle.
        // Bundles are an org feature; anonymous callers (no account) can't
        // have one, so a bundle param from them is a clear 422 instead of
        // an org lookup on a null user.
        const rawQuery = (request.query ?? {}) as { bundle?: unknown };
        const rawBody = (request.body ?? {}) as { bundle?: unknown };
        const bundleId =
          typeof rawQuery.bundle === "string" ? rawQuery.bundle :
          typeof rawBody.bundle === "string" ? rawBody.bundle : undefined;
        if (bundleId && !ctx.userId) {
          return reply.code(422).send({
            error: "Bundle filtering requires an account. Sign in or use an API key.",
            code: "no_org_context",
          });
        }
        const resolved = ctx.userId
          ? await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply)
          : { ok: true as const, allowed: undefined };
        if (!resolved.ok) return reply;

        /* AR-376: capture the NL question for planner training (only
           when the caller actually sent a question — programmatic
           {plan} calls aren't training data). Latency is measured
           around runQuery; the insert happens AFTER the response is
           sent so it never adds to user-visible time. */
        // Anonymous callers (AR-594, Plan 059.2) have no account, so their
        // questions are never captured as training data — same rule as
        // programmatic {plan} calls above.
        const trainingQuestion: string | null =
          ctx.userId && "question" in parsed.req && typeof parsed.req.question === "string"
            ? parsed.req.question
            : null;
        const t0 = Date.now();

        // AR-597 (Plan 059.5): NL calls route to the model/provider the
        // caller's tier maps to, instead of the single global default.
        // Programmatic {plan} calls never touch the LLM — passing the
        // tier through is harmless either way since runQuery only
        // constructs a provider on the NL path.
        let result: Awaited<ReturnType<typeof runQuery>>;
        try {
          result = await runQuery(parsed.req, undefined, ctx.tier);
        } catch (err) {
          // AR-267: typed surface for ambiguous place names. Don't 500 —
          // tell the caller which candidates to disambiguate between.
          if (err instanceof AmbiguousLocationError) {
            if (trainingQuestion !== null && ctx.userId) {
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
          if (trainingQuestion !== null && ctx.userId) {
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
            if (trainingQuestion !== null && ctx.userId) {
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
        if (trainingQuestion !== null && ctx.userId) {
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
        // Methodology pinning is an org (Levers) feature; anonymous callers
        // have no org, so they always get the latest engine version.
        reply.header(
          "X-Engine-Version",
          ctx.userId ? await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId) : METHODOLOGY_VERSION,
        );
        return reply.code(200).send(result.response);
      } catch (error) {
        if (sendAppError(reply, error)) return;
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
            "security": [{ "bearerAuth": [] }],
            "body": {
              "type": "object",
              "required": ["target"],
              "properties": {
                "target": {
                  "type": "object",
                  "required": [],
                  "properties": {
                    "geo_code": { "type": "string", "minLength": 1 },
                    "postcode": { "type": "string", "minLength": 1 },
                    "area": { "type": "string", "minLength": 1 },
                  },
                  "description": "Exactly one of geo_code, postcode, or area must be set.",
                },
                "signals": { "type": "array", "items": { "type": "string", "minLength": 1 }, "minItems": 1, "maxItems": 20, "description": "Subset of signal dimensions to compare on." },
                "country": { "type": "string", "enum": ["England", "Wales", "Scotland"] },
                "lad": { "type": "string" },
                "k": { "type": "integer", "exclusiveMinimum": 0, "maximum": 200 },
                "min_signals": { "type": "integer", "exclusiveMinimum": 0, "maximum": 20 },
                "cohort_id": { "type": "string", "description": "Scope candidates to this org cohort." },
              },
              "example": { "target": { "postcode": "SW1A 1AA" }, "k": 10 },
            },
            response: {
              200: PeersResponseSchema,
              400: z.object({ error: z.string() }),
              404: z.object({ error: z.string() }),
              422: z.object({ error: z.string(), code: z.string() }),
              500: z.object({ error: z.string() }),
            },
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
        if (sendAppError(reply, error)) return;
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
            "security": [{ "bearerAuth": [] }],
            "body": {
              "type": "object",
              "required": ["signal_key"],
              "properties": {
                "signal_key": { "type": "string", "minLength": 1, "description": "Peer-relative-z derived signal key (e.g. 'crime.total_12m_peer_relative_z')." },
                "country": { "type": "string", "enum": ["England", "Wales", "Scotland"] },
                "lad": { "type": "string" },
                "min_abs_z": { "type": "number", "minimum": 0 },
                "k": { "type": "integer", "exclusiveMinimum": 0, "maximum": 500 },
              },
              "example": { "signal_key": "crime.total_12m_peer_relative_z", "country": "England", "k": 20 },
            },
            response: {
              200: InsightsResponseSchema,
              400: z.object({ error: z.string(), code: z.string().optional() }),
              404: z.object({ error: z.string() }),
              500: z.object({ error: z.string() }),
            },
        },
      }, async (request, reply) => {
      try {
        const ctx = await guardSignalsCtx(request, reply);
        if (!ctx) return reply;
        const { userId } = ctx;

        const body = (request.body ?? {}) as Record<string, unknown>;
        /* AR-391: friendly catch for the common `signal` vs `signal_key`
           field-name mistake. Without this the caller saw "Missing
           required 'signal_key'" with no hint that their `signal`
           field is the wrong name. ICP E2E finding #4. */
        if (typeof body.signal === "string" && typeof body.signal_key !== "string") {
          return reply.code(400).send({
            error: "Field name is 'signal_key' (not 'signal'). Value must be a peer-relative-z signal — e.g. 'crime.total_12m_peer_relative_z'. The base signal '" + body.signal + "' is queryable via /v1/area.",
            code: "wrong_field_name",
          });
        }
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
        if (sendAppError(reply, error)) return;
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
            "description": "Project a signal forward in time using linear regression over the trailing window.",
            "security": [{ "bearerAuth": [] }],
            "body": {
              "type": "object",
              "required": ["target"],
              "properties": {
                "target": {
                  "type": "object",
                  "properties": {
                    "geo_code": { "type": "string", "minLength": 1 },
                    "postcode": { "type": "string", "minLength": 1 },
                    "area": { "type": "string", "minLength": 1 },
                  },
                  "description": "Exactly one of geo_code, postcode, or area must be set.",
                },
                "signal_key": { "type": "string", "minLength": 1 },
                "window_months": { "type": "integer", "minimum": 6, "maximum": 120 },
                "horizon_months": { "type": "integer", "exclusiveMinimum": 0, "maximum": 60 },
              },
              "example": { "target": { "postcode": "SW1A 1AA" }, "signal_key": "crime.total_12m", "window_months": 24, "horizon_months": 12 },
            },
            response: {
              200: ForecastResponseSchema,
              400: z.object({ error: z.string() }),
              404: z.object({ error: z.string() }),
              500: z.object({ error: z.string() }),
            },
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
        if (sendAppError(reply, error)) return;
        logger.error("[v1/forecast] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
