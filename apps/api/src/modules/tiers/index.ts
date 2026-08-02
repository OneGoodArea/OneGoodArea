/* AR-500 (Plan 045) + AR-499 (Plan 044): Tier resolution + quota + LLM routing.

   resolveTier() is the SINGLE SOURCE OF TRUTH for determining a caller's
   tier. checkQuota() is the ONLY quota gate. decideLlm() is the ONLY LLM
   router. Callers query these and obey their verdicts — no module computes
   its own limits or model selection. */

import { sql } from "../../infrastructure/db/client";
import { row, type UserRow } from "../../infrastructure/db/types";
import { resolveUserType } from "../usage";
import { getUserPlan } from "../usage";
import type { PlanId } from "../billing/plans";
import { rateLimit } from "../../infrastructure/rate-limit";
import { RATE_LIMITS } from "../../infrastructure/config";
import { getAiConfig } from "../ai/config";
import type { AiProviderEntry, AiStrategyRoute } from "../ai/types";
import type { BillingStrategy } from "./billing-strategy";
import { PlanBasedResolver } from "./strategies/plan-based";
import { PromotionalResolver } from "./strategies/promotional";
import { getEffectiveLimit } from "./config";

/** The tier taxonomy. Grows/collapses via the CHECK constraint on users.tier. */
export type Tier =
  | "anonymous"
  | "logged_in"
  | "basic"
  | "high_tier"
  | "engineering"
  | "superuser";

/** Quota configuration per tier. max=null means unlimited. */
export interface TierQuota {
  max: number | null;
  windowSeconds: number;
}

/** Full tier config: quota. LLM routing moved to the AI config (Plan 062)
    — decideLlm() reads the tier's strategy from there. */
export interface TierConfig {
  quota: TierQuota;
}

/** Context needed to resolve a caller's tier. */
export interface TierContext {
  /** The authenticated user's ID, or null for anonymous callers. */
  userId: string | null;
  /** Whether the caller has a valid API key (vs session-only). */
  hasApiKey: boolean;
}

/** The tier catalog. Quotas are per-minute sliding windows.
    Config-based deployment (Plan 044 B.5): env vars override defaults.
    LLM routing lives in the AI config (modules/ai/config.ts), not here. */
const DEFAULT_TIERS: Record<Tier, TierConfig> = {
  anonymous:   { quota: { max: 5,    windowSeconds: 60 } },
  logged_in:   { quota: { max: 30,   windowSeconds: 60 } },
  basic:       { quota: { max: 30,   windowSeconds: 60 } },
  high_tier:   { quota: { max: 120,  windowSeconds: 60 } },
  engineering: { quota: { max: null, windowSeconds: 0 } },
  superuser:   { quota: { max: null, windowSeconds: 0 } },
};

/**
 * Load tier config with env-var overrides. Each tier's quota max can be
 * overridden via env vars:
 *   TIER_<TIER>_QUOTA_MAX      — e.g. TIER_ANONYMOUS_QUOTA_MAX=10
 *
 * null means unlimited quota. Invalid env values are silently ignored.
 */
function loadTiersWithOverrides(): Record<Tier, TierConfig> {
  const tiers = { ...DEFAULT_TIERS };
  const tierNames = Object.keys(DEFAULT_TIERS) as Tier[];

  for (const name of tierNames) {
    const prefix = `TIER_${name.toUpperCase()}`;

    const quotaMaxEnv = process.env[`${prefix}_QUOTA_MAX`];
    if (quotaMaxEnv !== undefined) {
      const val = quotaMaxEnv.toLowerCase();
      tiers[name] = {
        ...tiers[name],
        quota: {
          ...tiers[name].quota,
          max: val === "null" || val === "unlimited" ? null : Number(quotaMaxEnv) || tiers[name].quota.max,
        },
      };
    }
  }

  return tiers;
}

/** The resolved tier catalog (loaded once at startup). */
export const TIERS: Record<Tier, TierConfig> = loadTiersWithOverrides();

/** Default billing strategy: plan-based resolution with promotional overrides. */
let billingStrategy: BillingStrategy = new PromotionalResolver(new PlanBasedResolver());

/** Set the billing strategy (for testing or strategy swapping). */
export function setBillingStrategy(strategy: BillingStrategy): void {
  billingStrategy = strategy;
}

/**
 * Resolve the caller's tier. Priority order (highest wins):
 *
 * 1. No user → "anonymous" (rate-limit bucket)
 * 2. user_type = 'superuser' → always "superuser"
 * 3. user_type = 'engineering' → always "engineering"
 * 4. billingStrategy.resolve(ctx) → billing-driven tier
 * 5. hasApiKey → "logged_in"
 * 6. Default → "basic"
 *
 * This is the ONLY function that determines tier. All callers must use it.
 */
export async function resolveTier(ctx: TierContext): Promise<Tier> {
  // Anonymous: no user row
  if (!ctx.userId) return "anonymous";

  // Resolve the user's type from the DB column.
  // user_type = 'superuser' or 'engineering' overrides everything.
  const userType = await resolveUserType(ctx.userId);
  if (userType === "superuser") return "superuser";
  if (userType === "engineering") return "engineering";

  // Delegate to the billing strategy for plan-based resolution.
  return billingStrategy.resolve({
    userId: ctx.userId,
    userType,
    hasApiKey: ctx.hasApiKey,
  });
}

/** Quota verdict returned by checkQuota. */
export interface QuotaVerdict {
  allowed: boolean;
  tier: Tier;
  remaining: number | null;
  reset: number | null;
  reason: string | null;
}

/** Identifier for the shared free-tier global daily bucket (AR-593, Plan 059.1). */
const FREE_TIER_GLOBAL_IDENTIFIER = "global:free-tier-daily";

/** Tiers subject to the shared free-tier global daily ceiling. */
const FREE_TIERS: ReadonlySet<Tier> = new Set(["anonymous", "logged_in", "basic"]);

/**
 * THE ONLY quota gate. Callers MUST use this and obey its verdict.
 * Returns whether the request is allowed under the tier's quota.
 * Unlimited tiers (engineering/superuser) always return allowed=true.
 *
 * Free tiers (anonymous/logged_in/basic) are additionally subject to a
 * shared global daily ceiling (AR-593, Plan 059.1) — a cost backstop on
 * top of, not instead of, the per-identifier quota above. It's only
 * checked once the per-identifier quota already passed, so requests
 * already rejected there don't consume the shared budget.
 */
export async function checkQuota(
  tier: Tier,
  identifier: string,
): Promise<QuotaVerdict> {
  const effectiveMax = getEffectiveLimit(tier);

  // Unlimited tier
  if (effectiveMax === null) {
    return { allowed: true, tier, remaining: null, reset: null, reason: null };
  }

  const result = await rateLimit(identifier, {
    max: effectiveMax,
    windowSeconds: TIERS[tier].quota.windowSeconds,
  });

  if (!result.success) {
    return {
      allowed: false,
      tier,
      remaining: result.remaining,
      reset: result.reset,
      reason: `Rate limit: ${effectiveMax} requests per ${TIERS[tier].quota.windowSeconds}s for ${tier} tier`,
    };
  }

  if (FREE_TIERS.has(tier)) {
    const globalResult = await rateLimit(FREE_TIER_GLOBAL_IDENTIFIER, RATE_LIMITS.freeTierGlobal);
    if (!globalResult.success) {
      return {
        allowed: false,
        tier,
        remaining: globalResult.remaining,
        reset: globalResult.reset,
        reason: `Free-tier global daily limit reached (${RATE_LIMITS.freeTierGlobal.max}/day across all anonymous and non-paying traffic)`,
      };
    }
  }

  return { allowed: true, tier, remaining: result.remaining, reset: result.reset, reason: null };
}

/** LLM routing verdict returned by decideLlm — a resolved strategy route
    built from the AI config (AR-614, Plan 062 S3). */
export type LlmRoute = AiStrategyRoute;

/**
 * THE ONLY LLM router. Returns the resolved strategy route for the given
 * tier: the strategy, the provider chain, and the retry budget from the
 * AI config (modules/ai/config.ts). Callers MUST use this instead of
 * hardcoding provider/model selection.
 */
export function decideLlm(tier: Tier): LlmRoute {
  const config = getAiConfig();
  const strategy = config.strategies[tier];
  if (!strategy) {
    throw new Error(`No AI strategy configured for tier: ${tier}`);
  }
  return {
    strategy: strategy.strategy,
    providers: strategy.providers as AiProviderEntry[],
    retryCount: config.aiRetryCount,
  };
}
