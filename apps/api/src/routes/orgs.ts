import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CreateOrgRequestSchema, UpdateOrgRequestSchema } from "@onegoodarea/contracts";
import { authenticateEither } from "../shared/auth-either";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { createOrgWithOwner, listOrgsForUser, getOrgIfMember, updateOrg, getRoleInOrg, hasAtLeastRole } from "../modules/orgs";
import { trackEvent } from "../modules/tracking/activity";

/** orgs route handlers — extracted from app.ts per AR-286. */
export function registerOrgsRoutes(app: FastifyInstance): void {
    app.post("/v1/orgs",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "Create organization",
            "description": "Creates a new organization. The caller becomes the owner.",
            "body": { "type": "object", "properties": { "name": { "type": "string" }, "slug": { "type": "string" } }, "example": { "name": "Acme Corp", "slug": "acme-corp" } }
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const parsed = CreateOrgRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const org = await createOrgWithOwner({
          name: parsed.data.name,
          slug: parsed.data.slug,
          userId,
        });
        trackEvent("api.org.created", userId, { orgId: org.id }, org.id);
        return reply.code(201).send(org);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs] create error:", error);
        // Most likely a slug collision (UNIQUE on orgs.slug). Surface a 409.
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "Slug already in use. Pick a different slug." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "List organizations",
            "description": "List organizations the caller is a member of, with their role."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const orgs = await listOrgsForUser(userId);
        return reply.code(200).send({ orgs });
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs] list error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/orgs/:id",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "Get organization",
            "description": "Get organization details by ID."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id } = request.params as { id: string };
        const org = await getOrgIfMember(id, userId);
        if (!org) return reply.code(404).send({ error: "Org not found" });
        return reply.code(200).send(org);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id] get error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.patch("/v1/orgs/:id",
      {
      schema: {
            "tags": [
                "Orgs"
            ],
            "summary": "Update organization",
            "description": "Update organization name, slug, or white-label settings."
        },
      }, async (request, reply) => {
      try {
        const userId = await authenticateEither(request, reply);
        if (!userId) return reply;
        const { id } = request.params as { id: string };
        const role = await getRoleInOrg(id, userId);
        if (!role) return reply.code(404).send({ error: "Org not found" });
        if (!hasAtLeastRole(role, "admin")) {
          return reply.code(403).send({ error: "Admin or owner required.", code: "admin_required" });
        }
        const parsed = UpdateOrgRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid request body." });
        }
        const updated = await updateOrg(id, parsed.data);
        if (!updated) return reply.code(404).send({ error: "Org not found" });
        trackEvent("api.org.updated", userId, { orgId: id }, id);
        return reply.code(200).send(updated);
      } catch (error) {
        if (isAppError(error)) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        logger.error("[v1/orgs/:id] update error:", error);
        const msg = error instanceof Error ? error.message : "";
        if (/duplicate key|unique constraint/i.test(msg)) {
          return reply.code(409).send({ error: "Slug already in use. Pick a different slug." });
        }
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
