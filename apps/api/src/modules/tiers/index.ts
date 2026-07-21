/* AR-500 (Plan 045) + AR-499 (Plan 044): Tier resolution.

   resolveTier() is the SINGLE SOURCE OF TRUTH for determining a caller's
   tier. It reads the users.tier column (set by privileged/internal path),
   falls back to plan-based mapping, and superuser overrides everything.

   Callers (API gate, LLM engine, future modules) MUST use resolveTier() and
   obey its verdict — no module computes its own tier logic. */

import { sql } from "../../infrastructure/db/client";
import { row, type UserRow } from "../../infrastructure/db/types";
import { isSuperuser, getUserPlan } from "../usage";
import type { PlanId } from "../billing/plans";

/** The tier taxonomy. Grows/collapses via the CHECK constraint on users.tier. */
export type Tier =
  | "anonymous"
  | "logged_in"
  | "basic"
  | "high_tier"
  | "engineering"
  | "superuser";

/** Context needed to resolve a caller's tier. */
export interface TierContext {
  /** The authenticated user's ID, or null for anonymous callers. */
  userId: string | null;
  /** Whether the caller has a valid API key (vs session-only). */
  hasApiKey: boolean;
}

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
