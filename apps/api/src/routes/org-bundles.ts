import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { CreateBundleRequestSchema, UpdateBundleRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { sendAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { hasAtLeastRole } from "../modules/orgs";
import { requireLeversAccess } from "../shared/require-levers";
import { listBundles, getBundle, createBundle, updateBundle, deleteBundle, findUnknownSignalKeys } from "../modules/orgs/bundles";
import { trackEvent } from "../modules/tracking/activity";

import { getRoleInOrg } from "../modules/orgs";
/** org-bundles route handlers — extracted from app.ts per AR-286. */
const IdParamsSchema = z.object({ id: z.string() });

export function registerOrgBundlesRoutes(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();
    typed.post("/v1/orgs/:id/bundles",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Create bundle",
            "description": "Create a signal bundle for an organization.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
            "body": CreateBundleRequestSchema,
            "response": {
                201: z.object({}).passthrough(),
                400: z.object({ error: z.string(), code: z.string() }),
                403: z.object({ error: z.string(), code: z.string() }),
                404: z.object({ error: z.string() }),
                409: z.object({ error: z.string() }),
                500: z.object({ error: z.string() }),
            },
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
        if (!(await requireLeversAccess(userId, reply))) return reply;
        const unknown = findUnknownSignalKeys(request.body.signal_keys);
        if (unknown.length > 0) {
          return reply.code(400).send({
            error: `Unknown signal keys: ${unknown.join(", ")}. See /docs/api-reference for the active taxonomy.`,
            code: "unknown_signal_keys",
          });
        }
        const bundle = await createBundle({
          orgId,
          name: request.body.name,
          slug: request.body.slug,
          signalKeys: request.body.signal_keys,
        });
        trackEvent("api.bundle.created", userId, { orgId, bundleId: bundle.id, count: bundle.signal_keys.length }, orgId);
        return reply.code(201).send(bundle);
      } catch (error) {
        if (sendAppError(reply, error)) return;
        logger.error("[v1/orgs/:id/bundles] create error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A bundle with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.get("/v1/orgs/:id/bundles",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "List bundles",
            "description": "List signal bundles for an organization.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
            "response": {
                200: z.object({ bundles: z.array(z.object({}).passthrough()), org_id: z.string(), caller_role: z.string() }).passthrough(),
                404: z.object({ error: z.string() }),
                500: z.object({ error: z.string() }),
            },
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
        if (sendAppError(reply, error)) return;
        logger.error("[v1/orgs/:id/bundles] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.get("/v1/orgs/:id/bundles/:bundleId",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Get bundle",
            "description": "Get a signal bundle by ID.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": {
              "type": "object",
              "required": ["id", "bundleId"],
              "properties": { "id": { "type": "string" }, "bundleId": { "type": "string" } },
            },
            "response": {
                200: z.object({}).passthrough(),
                404: z.object({ error: z.string() }),
                500: z.object({ error: z.string() }),
            },
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
        if (sendAppError(reply, error)) return;
        logger.error("[v1/orgs/:id/bundles/:bundleId] get error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.patch("/v1/orgs/:id/bundles/:bundleId",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Update bundle",
            "description": "Update a signal bundle's name or signal keys.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": {
              "type": "object",
              "required": ["id", "bundleId"],
              "properties": { "id": { "type": "string" }, "bundleId": { "type": "string" } },
            },
            "body": UpdateBundleRequestSchema,
            "response": {
                200: z.object({}).passthrough(),
                400: z.object({ error: z.string(), code: z.string() }),
                403: z.object({ error: z.string(), code: z.string() }),
                404: z.object({ error: z.string() }),
                409: z.object({ error: z.string() }),
                500: z.object({ error: z.string() }),
            },
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
        if (request.body.signal_keys) {
          const unknown = findUnknownSignalKeys(request.body.signal_keys);
          if (unknown.length > 0) {
            return reply.code(400).send({
              error: `Unknown signal keys: ${unknown.join(", ")}.`,
              code: "unknown_signal_keys",
            });
          }
        }
        const updated = await updateBundle(orgId, bundleId, {
          name: request.body.name,
          slug: request.body.slug,
          signalKeys: request.body.signal_keys,
        });
        if (!updated) return reply.code(404).send({ error: "Bundle not found" });
        trackEvent("api.bundle.updated", userId, { orgId, bundleId }, orgId);
        return reply.code(200).send(updated);
      } catch (error) {
        if (sendAppError(reply, error)) return;
        logger.error("[v1/orgs/:id/bundles/:bundleId] update error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A bundle with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.delete("/v1/orgs/:id/bundles/:bundleId",
      {
      schema: {
            "tags": [
                "Bundles"
            ],
            "summary": "Delete bundle",
            "description": "Delete a signal bundle.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": {
              "type": "object",
              "required": ["id", "bundleId"],
              "properties": { "id": { "type": "string" }, "bundleId": { "type": "string" } },
            },
            "response": {
                200: z.object({ deleted: z.literal(true) }),
                403: z.object({ error: z.string(), code: z.string() }),
                404: z.object({ error: z.string() }),
                500: z.object({ error: z.string() }),
            },
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
        if (sendAppError(reply, error)) return;
        logger.error("[v1/orgs/:id/bundles/:bundleId] delete error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
