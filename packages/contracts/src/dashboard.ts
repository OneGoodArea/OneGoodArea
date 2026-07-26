import { z } from "zod";
import { OrgSchema, OrgRoleSchema } from "./orgs";

export { ListWebhooksResponseSchema, CreatedWebhookSchema } from "./webhooks";

const PortfolioAreaSchema = z.object({
  id: z.string(),
  area: z.string(),
  label: z.string().nullable(),
});

const PortfolioRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  area_count: z.number(),
  areas: z.array(PortfolioAreaSchema),
});

export const MePortfoliosResponseSchema = z.object({
  portfolios: z.array(PortfolioRowSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const ScoreUsageResponseSchema = z.object({
  window_days: z.number(),
  total: z.number(),
  by_preset: z.array(z.object({
    preset: z.string(),
    count: z.number(),
  })),
});

export const MeOrgResponseSchema = z.object({
  org: OrgSchema.nullable(),
  caller_role: OrgRoleSchema.nullable(),
});

export const UpdateMeOrgResponseSchema = z.object({
  org: OrgSchema,
  caller_role: OrgRoleSchema,
});

export const MeProfileResponseSchema = z.object({
  plan: z.string(),
  plan_name: z.string(),
  generation: z.string(),
  api_access: z.boolean(),
  mcp_access: z.boolean(),
  api_calls_per_month: z.number(),
  used_this_month: z.number(),
  limit_this_month: z.number().nullable(),
  engine_version: z.string(),
  addons: z.array(z.string()),
  mcp_calls_this_month: z.number(),
  org: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    display_name: z.string().nullable(),
    brand_url: z.string().nullable(),
    role: z.string(),
  }).nullable(),
  key: z.object({
    allowed_ip_cidrs: z.array(z.string()),
    training_optout: z.boolean(),
  }),
});

export const DashboardResponseSchema = z.object({
  plan: z.string(),
  planName: z.string(),
  used: z.number(),
  limit: z.number(),
  mcp: z.object({
    access: z.boolean(),
    addonOwned: z.boolean(),
    includedFreeViaPlan: z.boolean(),
    callsThisMonth: z.number(),
  }),
  emailVerified: z.boolean(),
  primaryKey: z.object({
    key_prefix: z.string().nullable(),
    name: z.string(),
    last_used_at: z.string().nullable(),
  }).nullable(),
  latestCall: z.object({
    preset: z.string(),
    area: z.string(),
    score: z.number(),
    created_at: z.string(),
  }).nullable(),
});

export const SubscriptionInfoResponseSchema = z.object({
  plan: z.string(),
  planName: z.string(),
  hasStripeSubscription: z.boolean(),
  cancelAt: z.string().nullable(),
});

const SavedAreaSchema = z.object({
  id: z.string(),
  postcode: z.string(),
  label: z.string().nullable(),
  intent: z.string().nullable(),
  created_at: z.string(),
});

export const WatchlistResponseSchema = z.object({
  areas: z.array(SavedAreaSchema),
});

export const AddToWatchlistResponseSchema = z.object({
  area: SavedAreaSchema,
});
