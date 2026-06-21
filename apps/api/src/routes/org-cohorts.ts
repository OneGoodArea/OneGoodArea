import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CreateCohortRequestSchema, UpdateCohortRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getOrgIfMember, hasAtLeastRole } from "../modules/orgs";
import { listCohorts, getCohort, createCohort, updateCohort, deleteCohort } from "../modules/orgs/cohorts";
import { trackEvent } from "../modules/tracking/activity";

import { getRoleInOrg } from "../modules/orgs";
/** org-cohorts route handlers — extracted from app.ts per AR-286. */
export function registerOrgCohortsRoutes(app: FastifyInstance): void {
    app.post("/v1/orgs/:id/cohorts",
      {
      schema: {
            "tags": [
                "Cohorts"
            ],
            "summary": "Create cohort",
            "description": "Create an area cohort for an organization."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = CreateCohortRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const cohort = await createCohort({
          orgId,
          name: parsed.data.name,
          slug: parsed.data.slug,
          geoCodes: parsed.data.geo_codes,
        });
        trackEvent("api.cohort.created", userId, { orgId, cohortId: cohort.id, size: cohort.geo_codes.length }, orgId);
        return reply.code(201).send(cohort);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/cohorts] create error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A cohort with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs/:id/cohorts",
      {
      schema: {
            "tags": [
                "Cohorts"
            ],
            "summary": "List cohorts",
            "description": "List area cohorts for an organization."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const cohorts = await listCohorts(orgId);
        /* AR-311: include org_id + caller_role for client gating. */
        return reply.code(200).send({ cohorts, org_id: orgId, caller_role: role });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/cohorts] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs/:id/cohorts/:cohortId",
      {
      schema: {
            "tags": [
                "Cohorts"
            ],
            "summary": "Get cohort",
            "description": "Get an area cohort by ID."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId, cohortId } = request.params as { id: string; cohortId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const cohort = await getCohort(orgId, cohortId);
        if (!cohort) return reply.code(404).send({ error: "Cohort not found" });
        return reply.code(200).send(cohort);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/cohorts/:cohortId] get error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.patch("/v1/orgs/:id/cohorts/:cohortId",
      {
      schema: {
            "tags": [
                "Cohorts"
            ],
            "summary": "Update cohort",
            "description": "Update an area cohort."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId, cohortId } = request.params as { id: string; cohortId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = UpdateCohortRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const updated = await updateCohort(orgId, cohortId, {
          name: parsed.data.name,
          slug: parsed.data.slug,
          geoCodes: parsed.data.geo_codes,
        });
        if (!updated) return reply.code(404).send({ error: "Cohort not found" });
        trackEvent("api.cohort.updated", userId, { orgId, cohortId }, orgId);
        return reply.code(200).send(updated);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/cohorts/:cohortId] update error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A cohort with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.delete("/v1/orgs/:id/cohorts/:cohortId",
      {
      schema: {
            "tags": [
                "Cohorts"
            ],
            "summary": "Delete cohort",
            "description": "Delete an area cohort."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId, cohortId } = request.params as { id: string; cohortId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const ok = await deleteCohort(orgId, cohortId);
        if (!ok) return reply.code(404).send({ error: "Cohort not found" });
        trackEvent("api.cohort.deleted", userId, { orgId, cohortId }, orgId);
        return reply.code(200).send({ deleted: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/cohorts/:cohortId] delete error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
