import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireApiAccess } from "../shared/auth-api";
import { headerString } from "../shared/http";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { createWebhookSubscription, listWebhookSubscriptions, revokeWebhookSubscription, rotateWebhookSecret, validateWebhookUrl, validateEventTypes } from "../modules/webhooks";

/** webhooks route handlers — extracted from app.ts per AR-286. */
export function registerWebhooksRoutes(app: FastifyInstance): void {
    app.post("/v1/webhooks",
      {
      schema: {
            "tags": [
                "Webhooks"
            ],
            "summary": "Create webhook",
            "description": "Register a webhook endpoint for event notifications.",
            "body": { "type": "object", "properties": { "url": { "type": "string" }, "events": { "type": "array", "items": { "type": "string" } } }, "example": { "url": "https://example.com/hooks", "events": ["report.created"] } }
        },
      }, async (request, reply) => {
      try {
        const userId = await requireApiAccess(request, reply);
        if (!userId) return reply; // gate response already sent

        const body = request.body;
        if (typeof body !== "object" || body === null) {
          return reply.code(400).send({ error: "Request body must be { url, events: [...] }" });
        }
        const { url, events } = body as { url?: unknown; events?: unknown };

        const urlCheck = validateWebhookUrl(url);
        if (!urlCheck.valid) {
          return reply.code(400).send({ error: urlCheck.error });
        }

        const eventList = validateEventTypes(events);
        if (!eventList) {
          return reply.code(400).send({
            error: "events must be a non-empty array of supported types: 'report.created' or 'signal.changed'",
          });
        }

        const created = await createWebhookSubscription(userId, urlCheck.sanitized, eventList);
        return reply.code(201).send(created);
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/webhooks POST] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.get("/v1/webhooks",
      {
      schema: {
            "tags": [
                "Webhooks"
            ],
            "summary": "List webhooks",
            "description": "List registered webhooks."
        },
      }, async (request, reply) => {
      try {
        const userId = await requireApiAccess(request, reply);
        if (!userId) return reply; // gate response already sent

        const subscriptions = await listWebhookSubscriptions(userId);
        return reply.send({ subscriptions });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/webhooks GET] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.delete<{ Params: { id: string } }>("/v1/webhooks/:id", {
      schema: { tags: ["Webhooks"], summary: "Delete webhook", description: "Delete a registered webhook." },
    }, async (request, reply) => {
      try {
        const userId = await requireApiAccess(request, reply);
        if (!userId) return reply; // gate response already sent

        const { id } = request.params;
        const revoked = await revokeWebhookSubscription(userId, id);
        if (!revoked) {
          return reply.code(404).send({ error: "Webhook subscription not found or already revoked" });
        }
        return reply.send({ id, status: "revoked" });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/webhooks/:id DELETE] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.post<{ Params: { id: string } }>("/v1/webhooks/:id/rotate-secret", {
      schema: { tags: ["Webhooks"], summary: "Rotate webhook secret", description: "Rotate the signing secret for a webhook." },
    }, async (request, reply) => {
      try {
        const userId = await requireApiAccess(request, reply);
        if (!userId) return reply;

        const { id } = request.params;
        const newSecret = await rotateWebhookSecret(userId, id);
        if (!newSecret) {
          return reply.code(404).send({ error: "Webhook subscription not found or already revoked" });
        }
        return reply.send({ id, secret: newSecret });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/webhooks/:id/rotate-secret POST] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });
}
