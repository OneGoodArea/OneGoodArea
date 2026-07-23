import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { CreatePresetRequestSchema, UpdatePresetRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getOrgIfMember, hasAtLeastRole } from "../modules/orgs";
import { requireLeversAccess } from "../shared/require-levers";
import { listPresets, getPreset, createPreset, updatePreset, deletePreset, findUnknownWeightKeys } from "../modules/orgs/presets";
import { trackEvent } from "../modules/tracking/activity";

import { getRoleInOrg } from "../modules/orgs";
/** org-presets route handlers — extracted from app.ts per AR-286. */
const IdParamsSchema = z.object({ id: z.string() });

export function registerOrgPresetsRoutes(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();
    typed.post("/v1/orgs/:id/presets",
      {
      schema: {
            "tags": [
                "Presets"
            ],
            "summary": "Create preset",
            "description": "Create a scoring preset for an organization.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
            "body": CreatePresetRequestSchema,
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
        const unknown = findUnknownWeightKeys(request.body.base_preset, request.body.weights);
        if (unknown.length > 0) {
          return reply.code(400).send({
            error: `Unknown dimension keys for base_preset '${request.body.base_preset}': ${unknown.join(", ")}.`,
            code: "unknown_weight_keys",
          });
        }
        const preset = await createPreset({
          orgId,
          name: request.body.name,
          slug: request.body.slug,
          basePreset: request.body.base_preset,
          weights: request.body.weights,
        });
        trackEvent("api.preset.created", userId, { orgId, presetId: preset.id, basePreset: preset.base_preset }, orgId);
        return reply.code(201).send(preset);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode as any).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/presets] create error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A preset with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.get("/v1/orgs/:id/presets",
      {
      schema: {
            "tags": [
                "Presets"
            ],
            "summary": "List presets",
            "description": "List scoring presets for an organization.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
            "response": {
                200: z.object({ presets: z.array(z.object({}).passthrough()), org_id: z.string(), caller_role: z.string() }).passthrough(),
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
        const presets = await listPresets(orgId);
        /* AR-311: include org_id + caller_role for client gating. */
        return reply.code(200).send({ presets, org_id: orgId, caller_role: role });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode as any).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/presets] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.get("/v1/orgs/:id/presets/:presetId",
      {
      schema: {
            "tags": [
                "Presets"
            ],
            "summary": "Get preset",
            "description": "Get a scoring preset by ID.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": {
              "type": "object",
              "required": ["id", "presetId"],
              "properties": { "id": { "type": "string" }, "presetId": { "type": "string" } },
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
        const { id: orgId, presetId } = request.params as { id: string; presetId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const preset = await getPreset(orgId, presetId);
        if (!preset) return reply.code(404).send({ error: "Preset not found" });
        return reply.code(200).send(preset);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode as any).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/presets/:presetId] get error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.patch("/v1/orgs/:id/presets/:presetId",
      {
      schema: {
            "tags": [
                "Presets"
            ],
            "summary": "Update preset",
            "description": "Update a scoring preset's name, base preset, or weights.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": {
              "type": "object",
              "required": ["id", "presetId"],
              "properties": { "id": { "type": "string" }, "presetId": { "type": "string" } },
            },
            "body": UpdatePresetRequestSchema,
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
        const { id: orgId, presetId } = request.params as { id: string; presetId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        // Weights are validated against the EFFECTIVE base_preset after the
        // patch. If the caller only patches weights, we need the existing
        // base_preset; if they patch base_preset too, we use the new one.
        // Fetch once to resolve the effective values.
        const existing = await getPreset(orgId, presetId);
        if (!existing) return reply.code(404).send({ error: "Preset not found" });
        const effectiveBase = request.body.base_preset ?? existing.base_preset;
        const effectiveWeights = request.body.weights ?? existing.weights;
        const unknown = findUnknownWeightKeys(effectiveBase, effectiveWeights);
        if (unknown.length > 0) {
          return reply.code(400).send({
            error: `Unknown dimension keys for base_preset '${effectiveBase}': ${unknown.join(", ")}.`,
            code: "unknown_weight_keys",
          });
        }
        const updated = await updatePreset(orgId, presetId, {
          name: request.body.name,
          slug: request.body.slug,
          basePreset: request.body.base_preset,
          weights: request.body.weights,
        });
        if (!updated) return reply.code(404).send({ error: "Preset not found" });
        trackEvent("api.preset.updated", userId, { orgId, presetId }, orgId);
        return reply.code(200).send(updated);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode as any).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/presets/:presetId] update error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "A preset with that slug already exists in this org." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.delete("/v1/orgs/:id/presets/:presetId",
      {
      schema: {
            "tags": [
                "Presets"
            ],
            "summary": "Delete preset",
            "description": "Delete a scoring preset.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": {
              "type": "object",
              "required": ["id", "presetId"],
              "properties": { "id": { "type": "string" }, "presetId": { "type": "string" } },
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
        const { id: orgId, presetId } = request.params as { id: string; presetId: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const ok = await deletePreset(orgId, presetId);
        if (!ok) return reply.code(404).send({ error: "Preset not found" });
        trackEvent("api.preset.deleted", userId, { orgId, presetId }, orgId);
        return reply.code(200).send({ deleted: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode as any).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/presets/:presetId] delete error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
