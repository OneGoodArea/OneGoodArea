import { z } from "zod";

export const WebhookSubscriptionSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  status: z.string(),
  created_at: z.string(),
  last_success_at: z.string().nullable(),
  last_failure_at: z.string().nullable(),
});

export const CreatedWebhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string(),
  created_at: z.string(),
});

export const ListWebhooksResponseSchema = z.object({
  subscriptions: z.array(WebhookSubscriptionSchema),
});

export const DeleteWebhookResponseSchema = z.object({
  id: z.string(),
  status: z.literal("revoked"),
});

export const RotateSecretResponseSchema = z.object({
  id: z.string(),
  secret: z.string(),
});
