/* Backend configuration boundary.

   apps/api is a standalone containerised service: config comes straight from
   process.env (the container/orchestrator injects it). This deliberately does
   NOT port the legacy Next runtime/env subsystem, which reads .env files off
   the project root at runtime - that behaviour is specific to the Next app and
   does not fit a long-running service. Add fields here as modules need them. */

export interface ApiConfig {
  // Runtime
  port: number;
  host: string;
  nodeEnv: string;

  // Database
  databaseUrl: string | undefined;

  // Auth
  authSecret: string | undefined;
  nextAuthUrl: string;

  // AI
  aiProvider: string;
  anthropicApiKey: string | undefined;

  // Email
  emailProvider: string;
  resendApiKey: string | undefined;

  // Stripe
  stripeSecretKey: string | undefined;
  stripeApiBaseUrl: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripePriceIds: {
    starter: string;
    pro: string;
    developer: string;
    business: string;
    growth: string;
    starterV2: string;
    build: string;
    buildAnnual: string;
    scale: string;
    scaleAnnual: string;
    growthV2: string;
    growthV2Annual: string;
    enterprise: string;
    mcpAddon: string;
  };

  // Feature flags
  signalsApiEnabled: boolean;
  signalsStoreRead: boolean;

  // Cron
  cronSecret: string | undefined;

  // AR-377: bounded retention for training data tables
  // (query_planner_logs + brief_composer_logs). Rows older than this
  // many days are purged by the nightly /cron/training-retention job.
  // 0 disables purging (kept indefinitely). Default 365.
  trainingDataRetentionDays: number;

  // Logging
  logLevel: string;
  localRuntimeEnabled: boolean;

  // Mock AI (test/local only)
  mockAi: {
    forceFailure: boolean;
    latencyMs: number;
    tokenLimit: number;
    rateLimitEveryN: number;
  };

  // Eval script gate
  evalPlanEnabled: boolean;
}

export function getConfig(): ApiConfig {
  return {
    // Runtime
    port: Number(process.env.PORT ?? 8080),
    host: process.env.HOST ?? "0.0.0.0",
    nodeEnv: process.env.NODE_ENV ?? "development",

    // Database
    databaseUrl: process.env.DATABASE_URL,

    // Auth
    authSecret: process.env.AUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL || "https://www.onegoodarea.com",

    // AI
    aiProvider: process.env.OGA_AI_PROVIDER ?? "anthropic",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // Email
    emailProvider: process.env.OGA_EMAIL_PROVIDER ?? "resend",
    resendApiKey: process.env.RESEND_API_KEY,

    // Stripe
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeApiBaseUrl: process.env.STRIPE_API_BASE_URL || undefined,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePriceIds: {
      starter: process.env.STRIPE_STARTER_PRICE_ID || "",
      pro: process.env.STRIPE_PRO_PRICE_ID || "",
      developer: process.env.STRIPE_DEVELOPER_PRICE_ID || "price_1TQrWc0oI5PvXSlpqAlXQaG8",
      business: process.env.STRIPE_BUSINESS_PRICE_ID || "price_1TQrWd0oI5PvXSlpFeLRBkAt",
      growth: process.env.STRIPE_GROWTH_PRICE_ID || "price_1TQrWd0oI5PvXSlpSB3yrjxx",
      starterV2: process.env.STRIPE_STARTER_V2_PRICE_ID || "price_1TQsJ10oI5PvXSlpvLLYjjBg",
      build: process.env.STRIPE_BUILD_PRICE_ID || "price_1TQsJL0oI5PvXSlpPL5qXBaI",
      buildAnnual: process.env.STRIPE_BUILD_ANNUAL_PRICE_ID || "price_1TQsJL0oI5PvXSlpRQK8ZfDI",
      scale: process.env.STRIPE_SCALE_PRICE_ID || "price_1TQsJe0oI5PvXSlpAkOGfgrf",
      scaleAnnual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || "price_1TQsJe0oI5PvXSlprLyH5Lfg",
      growthV2: process.env.STRIPE_GROWTH_V2_PRICE_ID || "price_1TQsJ10oI5PvXSlpSvWzjC7w",
      growthV2Annual: process.env.STRIPE_GROWTH_V2_ANNUAL_PRICE_ID || "price_1TQsJ10oI5PvXSlpGkr8TnG8",
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_1TQsJe0oI5PvXSlpHCsKdgKA",
      mcpAddon: process.env.STRIPE_MCP_ADDON_PRICE_ID || "price_1TQsJ10oI5PvXSlpBHmvxdJL",
    },

    // Feature flags
    signalsApiEnabled: process.env.OGA_SIGNALS_API === "true",
    signalsStoreRead: process.env.OGA_SIGNALS_STORE_READ === "true",

    // Cron
    cronSecret: process.env.CRON_SECRET,
    trainingDataRetentionDays: (() => {
      const raw = process.env.TRAINING_DATA_RETENTION_DAYS;
      const parsed = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 365;
    })(),

    // Logging
    logLevel: process.env.OGA_LOG_LEVEL ?? (process.env.OGA_LOCAL_RUNTIME_ENABLED === "true" ? "debug" : "info"),
    localRuntimeEnabled: process.env.OGA_LOCAL_RUNTIME_ENABLED === "true",

    // Mock AI
    mockAi: {
      forceFailure: process.env.OGA_MOCK_AI_FORCE_FAILURE === "true",
      latencyMs: Number(process.env.OGA_MOCK_AI_LATENCY_MS ?? 0),
      tokenLimit: Number(process.env.OGA_MOCK_AI_TOKEN_LIMIT ?? 4096),
      rateLimitEveryN: Number(process.env.OGA_MOCK_AI_RATE_LIMIT_EVERY_N ?? 0),
    },

    // Eval
    evalPlanEnabled: process.env.OGA_EVAL_PLAN === "true",
  };
}

/* Static config constants (migrated verbatim from legacy src/lib/config.ts).
   Not env-derived, so they are plain exports rather than fields on getConfig(). */

export const SUPERUSER_EMAILS = ["ptengelmann@gmail.com"];

/* The PUBLIC frontend (apps/web) base URL. Used to build Stripe redirect URLs
   (checkout success/cancel, billing-portal return) which must point at the
   browser-facing site, NOT at this API origin. Read once at startup from the
   container env; falls back to the canonical domain. Mirrors legacy
   src/lib/config.ts APP_URL. */
export const APP_URL = process.env.NEXTAUTH_URL || "https://www.onegoodarea.com";

/* The From address for all outbound email. Migrated verbatim from legacy
   src/lib/config.ts. */
export const EMAIL_FROM = "OneGoodArea <noreply@onegoodarea.com>";

export const RATE_LIMITS = {
  report: { max: 10, windowSeconds: 60 },
  apiReport: { max: 30, windowSeconds: 60 },
  // Each batch HTTP call carries up to 100 reports, so we rate-limit batches
  // more aggressively at the call level. Per-report quota is enforced separately.
  apiBatch: { max: 5, windowSeconds: 60 },
  widget: { max: 60, windowSeconds: 3600 },
  authRegister: { max: 5, windowSeconds: 60 },
  authSignIn: { max: 10, windowSeconds: 60 },
} as const;

// Bulk endpoint hard cap. Larger workloads should use the async pattern (roadmap).
export const BATCH_MAX_ITEMS = 100;

// Process at most N items concurrently inside one batch request. Bounds the
// fan-out into Anthropic + parallel data sources so we don't slam the upstream.
export const BATCH_CONCURRENCY = 5;

/* Monthly GBP price per plan, used for the admin MRR + ARR calculation.

   AR-313 Phase 3 (2026-06-15): added the v2 plan keys. Pre-V2 versions
   of this table only listed v1 names (starter / pro / developer /
   business / growth) which silently returned 0 for any v2 customer's
   MRR contribution — the admin MRR has been undercounting V2 ARR since
   v2 launched. v1 entries kept for grandfathered subscribers. */
export const PLAN_PRICES_GBP: Record<string, number> = {
  // v1 (grandfathered subscribers only)
  starter: 29,
  pro: 79,
  developer: 49,
  business: 249,
  growth: 499,
  // v2 (current)
  starter_v2: 49,
  build: 149,
  scale: 499,
  growth_v2: 1499,
  enterprise: 4999,
};
