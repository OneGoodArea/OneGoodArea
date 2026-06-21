import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CreateBundleRequestSchema, UpdateBundleRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getOrgIfMember, hasAtLeastRole } from "../modules/orgs";
import { listBundles, getBundle, createBundle, updateBundle, deleteBundle, findUnknownSignalKeys } from "../modules/orgs/bundles";
import { trackEvent } from "../modules/tracking/activity";

import { getRoleInOrg } from "../modules/orgs";
/** org-bundles route handlers — extracted from app.ts per AR-286. */
export function registerOrgBundlesRoutes(app: FastifyInstance): void {
    app.post("/v1/orgs/:id/bundles",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Create bundle",
            "description": "Create a signal bundle for an organization."
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
        const parsed = CreateBundleRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const unknown = findUnknownSignalKeys(parsed.data.signal_keys);
        if (unknown.length > 0) {
          return reply.code(400).send({
            error: `Unknown signal keys: ${unknown.join(", ")}. See /docs/api-reference for the active taxonomy.`,
            code: "unknown_signal_keys",
          });
        }
        const bundle = await createBundle({
          orgId,
          name: parsed.data.name,
          slug: parsed.data.slug,
          signalKeys: parsed.data.signal_keys,
        });
        trackEvent("api.bundle.created", userId, { orgId, bundleId: bundle.id, count: bundle.signal_keys.length }, orgId);
        return reply.code(201).send(bundle);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/bundles] create error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A bundle with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs/:id/bundles",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "List bundles",
            "description": "List signal bundles for an organization."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const bundles = await listBundles(orgId);
        /* AR-311: include org_id + caller_role so the dashboard client can
           gate the Create button + show the slug-derived save target. */
        return reply.code(200).send({ bundles, org_id: orgId, caller_role: role });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/bundles] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs/:id/bundles/:bundleId",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Get bundle",
            "description": "Get a signal bundle by ID."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId, bundleId } = request.params as { id: string; bundleId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const bundle = await getBundle(orgId, bundleId);
        if (!bundle) return reply.code(404).send({ error: "Bundle not found" });
        return reply.code(200).send(bundle);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/bundles/:bundleId] get error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.patch("/v1/orgs/:id/bundles/:bundleId",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Update bundle",
            "description": "Update a signal bundle's name or signal keys."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId, bundleId } = request.params as { id: string; bundleId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = UpdateBundleRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        if (parsed.data.signal_keys) {
          const unknown = findUnknownSignalKeys(parsed.data.signal_keys);
          if (unknown.length > 0) {
            return reply.code(400).send({
              error: `Unknown signal keys: ${unknown.join(", ")}.`,
              code: "unknown_signal_keys",
            });
          }
        }
        const updated = await updateBundle(orgId, bundleId, {
          name: parsed.data.name,
          slug: parsed.data.slug,
          signalKeys: parsed.data.signal_keys,
        });
        if (!updated) return reply.code(404).send({ error: "Bundle not found" });
        trackEvent("api.bundle.updated", userId, { orgId, bundleId }, orgId);
        return reply.code(200).send(updated);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/bundles/:bundleId] update error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A bundle with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.delete("/v1/orgs/:id/bundles/:bundleId",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Delete bundle",
            "description": "Delete a signal bundle."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId, bundleId } = request.params as { id: string; bundleId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const ok = await deleteBundle(orgId, bundleId);
        if (!ok) return reply.code(404).send({ error: "Bundle not found" });
        trackEvent("api.bundle.deleted", userId, { orgId, bundleId }, orgId);
        return reply.code(200).send({ deleted: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/bundles/:bundleId] delete error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
