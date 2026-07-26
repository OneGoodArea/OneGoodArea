import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireApiAccess } from "../shared/auth-api";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { createWebhookSubscription, listWebhookSubscriptions, revokeWebhookSubscription, rotateWebhookSecret, validateWebhookUrl, validateEventTypes } from "../modules/webhooks";
import { CreatedWebhookSchema, ListWebhooksResponseSchema, DeleteWebhookResponseSchema, RotateSecretResponseSchema } from "@onegoodarea/contracts";

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
            "security": [{ "bearerAuth": [] }],
            /* AR-548: documented but not schema-enforced. The handler owns this
               contract: validateWebhookUrl rejects a bad URL, and
               validateEventTypes filters unsupported types and de-duplicates
               the rest (AR-328). An `enum` here rejected the whole request
               instead, so a list containing one unsupported type failed rather
               than being filtered. */
            "body": {
              "type": "object",
              "properties": {
                "url": { "type": "string", "format": "uri", "minLength": 1, "description": "Required. HTTPS webhook endpoint URL." },
                "events": { "type": "array", "items": { "type": "string" }, "description": "Required. Supported: 'signal.changed'. Unsupported entries are filtered out and duplicates collapsed." },
              },
              "example": { "url": "https://example.com/hooks", "events": ["signal.changed"] },
            },
            "response": {
              201: CreatedWebhookSchema,
              400: z.object({ error: z.string() }),
              500: z.object({ error: z.string() }),
            },
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
            error: "events must be a non-empty array of supported types: 'signal.changed'",
          });
        }

        const created = await createWebhookSubscription(userId, urlCheck.sanitized, eventList);
        return reply.code(201).send(created);
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode as 400).send({ error: error.message, code: error.code });
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
            "description": "List registered webhooks.",
            "security": [{ "bearerAuth": [] }],
            "response": {
              200: ListWebhooksResponseSchema,
              500: z.object({ error: z.string() }),
            },
        },
      }, async (request, reply) => {
      try {
        const userId = await requireApiAccess(request, reply);
        if (!userId) return reply; // gate response already sent

        const subscriptions = await listWebhookSubscriptions(userId);
        return reply.send({ subscriptions });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode as 500).send({ error: error.message, code: error.code });
        }
        logger.error("[v1/webhooks GET] error:", error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    });

    app.delete<{ Params: { id: string } }>("/v1/webhooks/:id", {
      schema: { tags: ["Webhooks"], summary: "Delete webhook", description: "Delete a registered webhook.", security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }, response: { 200: DeleteWebhookResponseSchema, 404: z.object({ error: z.string() }), 500: z.object({ error: z.string() }) } },
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
      schema: { tags: ["Webhooks"], summary: "Rotate webhook secret", description: "Rotate the signing secret for a webhook.", security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }, response: { 200: RotateSecretResponseSchema, 404: z.object({ error: z.string() }), 500: z.object({ error: z.string() }) } },
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
