/* Backend configuration boundary.

   apps/api is a standalone containerised service: config comes straight from
   process.env (the container/orchestrator injects it). This deliberately does
   NOT port the legacy Next runtime/env subsystem, which reads .env files off
   the project root at runtime - that behaviour is specific to the Next app and
   does not fit a long-running service. Add fields here as modules need them. */

export interface ApiConfig {
  /** AI narration provider: "anthropic" (default) or "mock" for local/tests. */
  aiProvider: string;
  /** Email provider: "resend" (default) or "mailhog" for local dev. */
  emailProvider: string;
}

export function getConfig(): ApiConfig {
  return {
    aiProvider: process.env.OGA_AI_PROVIDER ?? "anthropic",
    emailProvider: process.env.OGA_EMAIL_PROVIDER ?? "resend",
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

// Monthly GBP price per plan, used for the admin MRR calculation.
export const PLAN_PRICES_GBP: Record<string, number> = {
  starter: 29,
  pro: 79,
  developer: 49,
  business: 249,
  growth: 499,
};
