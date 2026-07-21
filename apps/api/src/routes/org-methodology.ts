import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { SetMethodologyPinRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { getOrgIfMember, hasAtLeastRole } from "../modules/orgs";
import { getMethodologyPin, setMethodologyPin, clearMethodologyPin } from "../modules/orgs/methodology";
import { getSupportedEngineVersions } from "../modules/engine/version";
import { trackEvent } from "../modules/tracking/activity";

import { getRoleInOrg } from "../modules/orgs";
/** org-methodology route handlers — extracted from app.ts per AR-286. */
const IdParamsSchema = z.object({ id: z.string() });

export function registerOrgMethodologyRoutes(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();
    typed.get("/v1/orgs/:id/methodology",
      {
      schema: {
            "tags": [
                "Methodology"
            ],
            "summary": "Get methodology pin",
            "description": "Get the engine version pin for an organization.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        const pin = await getMethodologyPin(orgId);
        return reply.code(200).send({ engine_version: pin, pinned: pin !== null });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/methodology] get error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.put("/v1/orgs/:id/methodology",
      {
      schema: {
            "tags": [
                "Methodology"
            ],
            "summary": "Set methodology pin",
            "description": "Pin a specific engine version for the organization.",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
            "body": SetMethodologyPinRequestSchema,
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        // Methodology pin is owner-only — compliance / audit anchor.
        if (!hasAtLeastRole(role, "owner")) {
          return reply.code(403).send({ error: "Owner-only operation.", code: "owner_required" });
        }
        const supported = getSupportedEngineVersions();
        if (!supported.includes(request.body.engine_version)) {
          return reply.code(400).send({
            error: `Unsupported engine_version "${request.body.engine_version}". Supported: ${supported.join(", ")}.`,
            code: "unsupported_engine_version",
            supported_versions: supported,
          });
        }
        await setMethodologyPin(orgId, request.body.engine_version);
        trackEvent("api.methodology.pinned", userId, { orgId, engineVersion: request.body.engine_version }, orgId);
        return reply.code(200).send({ engine_version: request.body.engine_version, pinned: true });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/methodology] set error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    typed.delete("/v1/orgs/:id/methodology",
      {
      schema: {
            "tags": [
                "Methodology"
            ],
            "summary": "Clear methodology pin",
            "description": "Remove the engine version pin (revert to latest).",
            "security": [{ "bearerAuth": [] }, { "bridgeToken": [] }],
            "params": IdParamsSchema,
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id: orgId } = request.params as { id: string };
        const role = await getRoleInOrg(orgId, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        // Methodology pin is owner-only — compliance / audit anchor.
        if (!hasAtLeastRole(role, "owner")) {
          return reply.code(403).send({ error: "Owner-only operation.", code: "owner_required" });
        }
        const removed = await clearMethodologyPin(orgId);
        if (removed) {
          trackEvent("api.methodology.unpinned", userId, { orgId }, orgId);
        }
        return reply.code(200).send({ engine_version: null, pinned: false });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id/methodology] clear error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
