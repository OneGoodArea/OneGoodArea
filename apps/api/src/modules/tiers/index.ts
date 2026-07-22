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

/** LLM routing configuration per tier. */
export interface TierLlm {
  provider: string;
  model: string;
}

/** Full tier config: quota + LLM routing. */
export interface TierConfig {
  quota: TierQuota;
  llm: TierLlm;
}

/** Context needed to resolve a caller's tier. */
export interface TierContext {
  /** The authenticated user's ID, or null for anonymous callers. */
  userId: string | null;
  /** Whether the caller has a valid API key (vs session-only). */
  hasApiKey: boolean;
}

/** The tier catalog. Quotas are per-minute sliding windows.
    LLM models are the default routing until provider-level overrides land.
    Config-based deployment (Plan 044 B.5) can overlay these via env/JSON. */
export const TIERS: Record<Tier, TierConfig> = {
  anonymous:   { quota: { max: 5,    windowSeconds: 60 }, llm: { provider: "anthropic", model: "claude-haiku-4-5" } },
  logged_in:   { quota: { max: 30,   windowSeconds: 60 }, llm: { provider: "anthropic", model: "claude-sonnet-4-5" } },
  basic:       { quota: { max: 30,   windowSeconds: 60 }, llm: { provider: "anthropic", model: "claude-haiku-4-5" } },
  high_tier:   { quota: { max: 120,  windowSeconds: 60 }, llm: { provider: "anthropic", model: "claude-sonnet-4-5" } },
  engineering: { quota: { max: null, windowSeconds: 0 },  llm: { provider: "anthropic", model: "claude-opus-4-6" } },
  superuser:   { quota: { max: null, windowSeconds: 0 },  llm: { provider: "anthropic", model: "claude-opus-4-6" } },
};

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

/**
 * THE ONLY quota gate. Callers MUST use this and obey its verdict.
 * Returns whether the request is allowed under the tier's quota.
 * Unlimited tiers (engineering/superuser) always return allowed=true.
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

  return {
    allowed: result.success,
    tier,
    remaining: result.remaining,
    reset: result.reset,
    reason: result.success ? null : `Rate limit: ${config.quota.max} requests per ${config.quota.windowSeconds}s for ${tier} tier`,
  };
}

/** LLM routing verdict returned by decideLlm. */
export interface LlmRoute {
  provider: string;
  model: string;
  tier: Tier;
}

/**
 * THE ONLY LLM router. Returns the provider+model for the given tier.
 * Callers MUST use this instead of hardcoding model selection.
 */
export function decideLlm(tier: Tier): LlmRoute {
  const config = TIERS[tier];
  return {
    provider: config.llm.provider,
    model: config.llm.model,
    tier,
  };
}
