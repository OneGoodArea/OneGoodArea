import { z } from "zod";

export const ApiKeyPreviewSchema = z.object({
  id: z.string(),
  key_preview: z.string(),
  name: z.string(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
  training_optout: z.boolean(),
});

export const DailyCountSchema = z.object({
  day: z.string(),
  count: z.number(),
});

export const ApiKeyUsageResponseSchema = z.object({
  totalRequests: z.number(),
  requestsThisMonth: z.number(),
  monthlyLimit: z.number(),
  dailyData: z.array(DailyCountSchema),
  lastRequestAt: z.string().nullable(),
  keys: z.array(ApiKeyPreviewSchema),
});

export const ListApiKeysResponseSchema = z.object({
  keys: z.array(ApiKeyPreviewSchema),
});

export const CreateApiKeyResponseSchema = z.object({
  key: z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
  }),
});
