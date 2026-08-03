import { z } from "zod";
import { IsoDateTimeSchema } from "./common";

export const WebhookSubscriptionSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  status: z.string(),
  created_at: IsoDateTimeSchema,
  last_success_at: IsoDateTimeSchema.nullable(),
  last_failure_at: IsoDateTimeSchema.nullable(),
});

export const CreatedWebhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string(),
  created_at: IsoDateTimeSchema,
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
