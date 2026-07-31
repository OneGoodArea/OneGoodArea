/* AR-500 (Plan 045) + AR-499 (Plan 044): Tier resolution + quota + LLM routing.

   resolveTier() is the SINGLE SOURCE OF TRUTH for determining a caller's
   tier. checkQuota() is the ONLY quota gate. decideLlm() is the ONLY LLM
   router. Callers query these and obey their verdicts — no module computes
   its own limits or model selection. */

import { sql } from "../../infrastructure/db/client";
import { row, type UserRow } from "../../infrastructure/db/types";
import { isSuperuser, getUserPlan } from "../usage";
import type { PlanId } from "../billing/plans";
import { rateLimit } from "../../infrastructure/rate-limit";
import { RATE_LIMITS } from "../../infrastructure/config";
import { getAiConfig } from "../ai/config";
import type { AiProviderEntry, AiStrategyRoute } from "../ai/types";

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

/**
 * Resolve the caller's tier. Priority order (highest wins):
 *
 * 1. Superuser (`is_superuser` DB column) → always "superuser"
 * 2. Engineering tier (users.tier column = "engineering")
 * 3. Plan-based mapping (billing subscription → tier)
 * 4. Logged-in with API key → "logged_in"
 * 5. Anonymous (no user) → "anonymous"
 *
 * This is the ONLY function that determines tier. All callers must use it.
 */
export async function resolveTier(ctx: TierContext): Promise<Tier> {
  // Anonymous: no user row
  if (!ctx.userId) return "anonymous";

  // Superuser overrides everything
  if (await isSuperuser(ctx.userId)) return "superuser";

  // Read the tier column (set by privileged path, default 'basic')
  const rows = await sql`SELECT tier FROM users WHERE id = ${ctx.userId}`;
  if (rows.length > 0) {
    const userTier = row<Pick<UserRow, "tier">>(rows[0]).tier;
    // If explicitly set to engineering or superuser (superuser handled above),
    // honour it. Other values fall through to plan-based mapping.
    if (userTier === "engineering") return "engineering";
    if (userTier === "high_tier") return "high_tier";
  }

  // Plan-based mapping: billing subscription determines tier
  const plan = await getUserPlan(ctx.userId);
  const planTier = planToTier(plan);
  if (planTier) return planTier;

  // Logged-in with API key but no plan match → logged_in
  if (ctx.hasApiKey) return "logged_in";

  // Default for logged-in users without API access
  return "basic";
}

/** Map a billing plan to a tier. Returns null if no mapping (caller falls through). */
function planToTier(plan: PlanId): Tier | null {
  switch (plan) {
    // V2 paid plans → high_tier (they have API access + higher quotas)
    case "starter_v2":
    case "build":
    case "scale":
    case "growth_v2":
    case "enterprise":
      return "high_tier";
    // V2 free tier → basic
    case "sandbox":
      return "basic";
    // V1 legacy paid → logged_in (grandfathered, lower tier)
    case "starter":
    case "pro":
      return "logged_in";
    // V1 legacy high-tier → high_tier
    case "developer":
    case "business":
    case "growth":
      return "high_tier";
    // V1 free → basic
    case "free":
      return "basic";
    default:
      return null;
  }
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
  const config = TIERS[tier];

  // Unlimited tier
  if (config.quota.max === null) {
    return { allowed: true, tier, remaining: null, reset: null, reason: null };
  }

  const result = await rateLimit(identifier, {
    max: config.quota.max,
    windowSeconds: config.quota.windowSeconds,
  });

  if (!result.success) {
    return {
      allowed: false,
      tier,
      remaining: result.remaining,
      reset: result.reset,
      reason: `Rate limit: ${config.quota.max} requests per ${config.quota.windowSeconds}s for ${tier} tier`,
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
