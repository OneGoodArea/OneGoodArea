import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { isSignalCategory, SIGNAL_CATEGORIES } from "@onegoodarea/contracts";
import { requireApiAccessWithOrg } from "../shared/auth-api";
import { resolveBundleForCaller, effectiveEngineVersionForCaller } from "../shared/bundles";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getConfig } from "../infrastructure/config";
import { validateLocationInput } from "../infrastructure/validation/validator";
import { getAreaProfile, queryAreas, parseAreasQuery } from "../modules/signals";
import { filterSignalsByBundle } from "../modules/orgs/bundles";
import { trackEvent } from "../modules/tracking/activity";

import type { Intent } from "@onegoodarea/contracts";
/** signals route handlers — extracted from app.ts per AR-286. */
export function registerSignalsRoutes(app: FastifyInstance): void {
    app.get("/v1/area",
      {
      schema: {
            "tags": [
                "Signals"
            ],
            "summary": "Get area profile",
            "description": "Full signal profile for a UK postcode or place name. Returns geo metadata plus all signal categories with sources.",
            "querystring": { "type": "object", "properties": { "area": { "type": "string", "example": "SW1A 1AA" }, "postcode": { "type": "string" } } }
        },
      }, async (request, reply) => {
      try {
        if (!getConfig().signalsApiEnabled) {
          return reply.code(404).send({ error: "Not found" });
        }

        const ctx = await requireApiAccessWithOrg(request, reply);
        if (!ctx) return reply; // 401 / 403 / 429 already sent

        const q = request.query as { area?: unknown; postcode?: unknown; bundle?: unknown };
        const rawArea =
          typeof q.area === "string" ? q.area : typeof q.postcode === "string" ? q.postcode : undefined;
        const locationCheck = validateLocationInput(rawArea);
        if (!locationCheck.valid) return reply.code(400).send({ error: locationCheck.error });

        // Levers (AR-195): if ?bundle=<id> is set, resolve the bundle for the
        // caller's org and use its signal_keys as a whitelist over the
        // response. Absent the param, behaviour is unchanged.
        const bundleId = typeof q.bundle === "string" ? q.bundle : undefined;
        const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
        if (!resolved.ok) return reply;

        const profile = await getAreaProfile(locationCheck.sanitized);
        if (!profile) {
          return reply.code(404).send({
            error: `Could not resolve area "${locationCheck.sanitized}". Provide a UK postcode or place name.`,
          });
        }

        const filteredSignals = filterSignalsByBundle(profile.signals, resolved.allowed);
        const filteredSources = resolved.allowed
          ? Array.from(new Set(filteredSignals.filter((s) => s.value !== null).map((s) => s.source)))
          : profile.meta.sources;

        trackEvent("api.area.profiled", ctx.userId, {
          area: locationCheck.sanitized,
          signals: filteredSignals.length,
          sources: filteredSources.length,
          bundle: bundleId ?? null,
        }, ctx.orgId);

        // Levers (AR-197): stamp the org pin (if set) on the response header.
        // Body `meta.engine_version` still reports what the engine actually
        // produced — until v3 freezes a separate engine module these are
        // equivalent in resolvedVersion, just distinguished by which one
        // the auditor cares about.
        const stamp = await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId);
        reply.header("X-Engine-Version", stamp);
        return reply.code(200).send({
          geo: profile.geo,
          signals: filteredSignals,
          meta: { ...profile.meta, sources: filteredSources },
        });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/area] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/signals/:category",
      {
      schema: {
            "tags": [
                "Signals"
            ],
            "summary": "Get signals by category",
            "description": "Returns all signals for a specific category (crime, deprivation, property, schools, amenities, transport, environment)."
        },
      }, async (request, reply) => {
      try {
        if (!getConfig().signalsApiEnabled) {
          return reply.code(404).send({ error: "Not found" });
        }

        const ctx = await requireApiAccessWithOrg(request, reply);
        if (!ctx) return reply; // 401 / 403 / 429 already sent
        const { userId } = ctx;

        const { category } = request.params as { category: string };
        if (!isSignalCategory(category)) {
          return reply.code(400).send({
            error: `Unknown signal category "${category}". Valid categories: ${SIGNAL_CATEGORIES.join(", ")}.`,
          });
        }

        const q = request.query as { area?: unknown; postcode?: unknown };
        const rawArea =
          typeof q.area === "string" ? q.area : typeof q.postcode === "string" ? q.postcode : undefined;
        const locationCheck = validateLocationInput(rawArea);
        if (!locationCheck.valid) return reply.code(400).send({ error: locationCheck.error });

        const profile = await getAreaProfile(locationCheck.sanitized);
        if (!profile) {
          return reply.code(404).send({
            error: `Could not resolve area "${locationCheck.sanitized}". Provide a UK postcode or place name.`,
          });
        }

        const signals = profile.signals.filter((s) => s.category === category);
        const sources = Array.from(new Set(signals.filter((s) => s.value !== null).map((s) => s.source)));

        trackEvent("api.signals.category", userId, {
          area: locationCheck.sanitized,
          category,
          signals: signals.length,
        }, ctx.orgId);

        reply.header("X-Engine-Version", profile.meta.engine_version);
        return reply.code(200).send({ geo: profile.geo, signals, meta: { ...profile.meta, sources } });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/signals] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/areas",
      {
      schema: {
            "tags": [
                "Signals"
            ],
            "summary": "Query areas by signal",
            "description": "Rank areas by a signal value. Supports country/LAD scoping, percentile and value filters, and compound multi-signal queries."
        },
      }, async (request, reply) => {
      try {
        if (!getConfig().signalsApiEnabled) {
          return reply.code(404).send({ error: "Not found" });
        }
        const ctx = await requireApiAccessWithOrg(request, reply);
        if (!ctx) return reply; // 401 / 403 / 429 already sent

        const parsed = parseAreasQuery((request.query ?? {}) as Record<string, unknown>);
        if (!parsed.ok) return reply.code(400).send({ error: parsed.error });

        // Levers (AR-195): if ?bundle=<id> is set, the requested ranking
        // signal MUST be in the bundle's whitelist — 422 otherwise. This is
        // a gate, not a filter (queryAreas takes one signal). The bundle
        // param is read from the raw query (parseAreasQuery doesn't expose
        // it but ignores unknown keys).
        const rawQuery = (request.query ?? {}) as { bundle?: unknown };
        const bundleId = typeof rawQuery.bundle === "string" ? rawQuery.bundle : undefined;
        const resolved = await resolveBundleForCaller(bundleId, ctx.orgId, ctx.userId, reply);
        if (!resolved.ok) return reply;
        if (resolved.allowed && !resolved.allowed.includes(parsed.query.signal)) {
          return reply.code(422).send({
            error: `Signal "${parsed.query.signal}" is not in bundle ${bundleId}.`,
            code: "bundle_signal_not_allowed",
          });
        }

        const areas = await queryAreas(parsed.query);

        trackEvent("api.areas.queried", ctx.userId, {
          signal: parsed.query.signal,
          country: parsed.query.country,
          lad: parsed.query.lad,
          results: areas.length,
          bundle: bundleId ?? null,
        }, ctx.orgId);
        reply.header("X-Engine-Version", await effectiveEngineVersionForCaller(ctx.orgId, ctx.userId));
        return reply.code(200).send({ signal: parsed.query.signal, count: areas.length, areas });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/areas] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    // AR-379: /widget removed. Embeddable widget surface was a v1
    // reports-era construct; AR-324 killed every writer to area_cache,
    // so the endpoint had been returning 404 for every query in prod.
    // If we want an embeddable surface in the future it'll be rebuilt
    // greenfield on the v2 signal-first stack — not a resurrection of
    // this code path. See plan/030.
}
