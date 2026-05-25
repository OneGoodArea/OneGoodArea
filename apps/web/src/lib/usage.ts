import { sql } from "@/lib/db";
import { PLANS, PlanId, API_PLANS, type AddonKey } from "@/lib/stripe";
import { UserRow, SubscriptionRow, row } from "@/lib/db-types";
import { SUPERUSER_EMAILS } from "@/lib/config";
import { ensureSubscriptionAddonsTable, ensureMcpUsageTable } from "@/lib/db-schema";

/** Aggregate count returned by COUNT(*)::int queries. */
interface CountRow { count: number; }

async function isSuperuser(userId: string): Promise<boolean> {
  const rows = await sql`SELECT email FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return false;
  const user = row<Pick<UserRow, "email">>(rows[0]);
  return SUPERUSER_EMAILS.includes(user.email);
}

export async function getUserPlan(userId: string): Promise<PlanId> {
  if (await isSuperuser(userId)) return "business";

  const rows = await sql`
    SELECT plan FROM subscriptions
    WHERE user_id = ${userId} AND status = 'active'
  `;
  // Default for users with no subscription row = sandbox (v2). This is what
  // makes the homepage's "Free sandbox · 35 API calls / month" claim TRUE.
  // Existing v1 grandfathered users have an explicit subscriptions row with
  // their plan name and are unaffected.
  if (rows.length === 0) return "sandbox";
  const sub = row<Pick<SubscriptionRow, "plan">>(rows[0]);
  return sub.plan as PlanId;
}

export async function hasApiAccess(userId: string): Promise<boolean> {
  if (await isSuperuser(userId)) return true;
  const plan = await getUserPlan(userId);
  return API_PLANS.includes(plan);
}

/**
 * Check if a user owns an active subscription add-on.
 * Source of truth: subscription_addons table.
 */
let _addonsTableReady = false;
async function ensureAddonsTable() {
  if (_addonsTableReady) return;
  await ensureSubscriptionAddonsTable();
  _addonsTableReady = true;
}

interface AddonRow { addon_key: string; status: string; }

export async function hasAddon(userId: string, addonKey: AddonKey): Promise<boolean> {
  await ensureAddonsTable();
  const rows = await sql`
    SELECT addon_key, status FROM subscription_addons
    WHERE user_id = ${userId} AND addon_key = ${addonKey} AND status = 'active'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function listAddons(userId: string): Promise<string[]> {
  await ensureAddonsTable();
  const rows = await sql`
    SELECT addon_key FROM subscription_addons
    WHERE user_id = ${userId} AND status = 'active'
  `;
  return rows.map((r) => row<AddonRow>(r).addon_key);
}

/**
 * MCP access is gated by EITHER plan.mcpAccess OR an active 'mcp' add-on.
 * Per AR-144:
 *   - Growth + Enterprise: included via plan.mcpAccess
 *   - Sandbox / Starter / Build / Scale: must purchase £29/mo add-on
 *   - V1 legacy tiers: no plan-included MCP, but can purchase add-on
 *
 * Superuser gets MCP for testing.
 */
export async function hasMcpAccess(userId: string): Promise<boolean> {
  if (await isSuperuser(userId)) return true;
  const plan = await getUserPlan(userId);
  if (PLANS[plan]?.mcpAccess === true) return true;
  return hasAddon(userId, "mcp");
}

/**
 * MCP usage tracking — increment monthly call counter when /api/v1/report
 * receives a request from the MCP server (User-Agent includes mcp-server).
 */
let _mcpUsageTableReady = false;
async function ensureMcpUsage() {
  if (_mcpUsageTableReady) return;
  await ensureMcpUsageTable();
  _mcpUsageTableReady = true;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function trackMcpCall(userId: string): Promise<void> {
  await ensureMcpUsage();
  const period = currentPeriod();
  await sql`
    INSERT INTO mcp_usage (user_id, period, call_count, last_call_at)
    VALUES (${userId}, ${period}, 1, NOW())
    ON CONFLICT (user_id, period) DO UPDATE SET
      call_count = mcp_usage.call_count + 1,
      last_call_at = NOW()
  `;
}

export async function getMcpUsageThisMonth(userId: string): Promise<number> {
  await ensureMcpUsage();
  const period = currentPeriod();
  const rows = await sql`
    SELECT call_count FROM mcp_usage
    WHERE user_id = ${userId} AND period = ${period}
  `;
  if (rows.length === 0) return 0;
  return row<{ call_count: number }>(rows[0]).call_count;
}

export async function getMonthlyReportCount(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int as count FROM reports
    WHERE user_id = ${userId}
    AND created_at >= date_trunc('month', NOW())
  `;
  return row<CountRow>(rows[0]).count;
}

export async function canGenerateReport(userId: string): Promise<{
  allowed: boolean;
  plan: PlanId;
  used: number;
  limit: number;
}> {
  const plan = await getUserPlan(userId);
  const used = await getMonthlyReportCount(userId);
  const limit = PLANS[plan].reportsPerMonth;

  const superuser = await isSuperuser(userId);

  return {
    allowed: superuser || used < limit,
    plan,
    used,
    limit: superuser ? Infinity : limit,
  };
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const rows = await sql`
    SELECT stripe_customer_id FROM subscriptions
    WHERE user_id = ${userId}
  `;
  if (rows.length === 0) return null;
  const sub = row<Pick<SubscriptionRow, "stripe_customer_id">>(rows[0]);
  return sub.stripe_customer_id;
}
