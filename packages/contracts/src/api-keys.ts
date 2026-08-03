import { z } from "zod";
import { IsoDateTimeSchema } from "./common";

export const ApiKeyPreviewSchema = z.object({
  id: z.string(),
  key_preview: z.string(),
  name: z.string(),
  created_at: IsoDateTimeSchema,
  last_used_at: IsoDateTimeSchema.nullable(),
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
  lastRequestAt: IsoDateTimeSchema.nullable(),
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
