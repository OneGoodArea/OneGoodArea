import { sql } from "../../../infrastructure/db/client";
import { row, type UserRow } from "../../../infrastructure/db/types";
import type { BillingStrategy } from "../billing-strategy";
import type { UserType } from "@onegoodarea/contracts";
import type { Tier } from "../index";
import { PLANS, type PlanId } from "../../billing/plans";
import { getUserPlan } from "../../usage";

export class PlanBasedResolver implements BillingStrategy {
  async resolve(ctx: { userId: string; userType: UserType; hasApiKey: boolean }): Promise<Tier> {
    // Billing-assigned tiers from the users.tier column.
    // These are set by privileged paths and override plan mapping.
    const rows = await sql`SELECT tier FROM users WHERE id = ${ctx.userId}`;
    if (rows.length > 0) {
      const userTier = row<Pick<UserRow, "tier">>(rows[0]).tier;
      if (userTier === "engineering") return "engineering";
      if (userTier === "high_tier") return "high_tier";
    }

    // Plan-based mapping: billing subscription determines tier.
    const plan = await getUserPlan(ctx.userId);
    const planTier = planToTier(plan);
    if (planTier) return planTier;

    // Logged-in with API key but no plan match.
    if (ctx.hasApiKey) return "logged_in";

    // Default for logged-in users without API access.
    return "basic";
  }
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