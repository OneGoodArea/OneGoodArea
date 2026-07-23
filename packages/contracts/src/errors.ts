import { z } from "zod";

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
}).strict();

export const OkResponseSchema = z.object({
  ok: z.literal(true),
}).strict();

export const NotOkResponseSchema = z.object({
  ok: z.literal(false),
}).strict();

export function PaginatedResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }).strict();
}
