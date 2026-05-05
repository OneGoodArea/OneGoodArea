import { sql } from "@/lib/db";
import { PLANS, PlanId, API_PLANS } from "@/lib/stripe";
import { UserRow, SubscriptionRow, row } from "@/lib/db-types";
import { SUPERUSER_EMAILS } from "@/lib/config";

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
