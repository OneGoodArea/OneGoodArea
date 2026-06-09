import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  getUserPlan,
  getMonthlyReportCount,
  hasMcpAccess,
  hasAddon,
} from "@/lib/usage";
import { PLANS } from "@/lib/stripe";
import DashboardHomeClient from "@/app/design-v2/dashboard/client";
import type { Metadata } from "next";

/* AR-254 [AR-217-B5] /dashboard Home replaces the legacy report-
   centric dashboard with the new API + MCP-shaped Home page.

   Server query: just the data the new client needs.
     - users.email_verified to gate the verify banner
     - first non-revoked api_keys row (key_prefix + name + last_used)
       for the hero card. Returns null if the user has no keys yet , 
       the client renders the "Create your first API key" CTA path.
     - plan + monthly usage for the usage card
     - MCP access + add-on ownership for the MCP card

   The old surface's reports list + saved areas + inline API keys
   management moved out of /dashboard. Reports live in their own
   route already; saved areas merge into /dashboard/monitor once
   that lands (Phase 2). API key management was always at /api-usage
   too the dashboard just duplicated the surface, which is what
   the Home redesign retires. */

export const metadata: Metadata = {
  title: "Home | OneGoodArea",
  description:
    "Your API key, the most common call, MCP access, and usage at a glance.",
};

interface PrimaryApiKey {
  key_prefix: string | null;
  name: string;
  last_used_at: string | null;
}

interface LatestCall {
  /** Preset slug used for the call (moving / business / investing /
      research). Matches the intent column on reports for now; will
      migrate to a dedicated preset_id column once we split scoring
      preset from intent at the schema level. */
  preset: string;
  /** Postcode / area the call was about. */
  area: string;
  score: number;
  created_at: string;
}

async function getLatestCall(userId: string): Promise<LatestCall | null> {
  /* Latest report row, ordered desc. We DON'T gate by month here:
     even if last call was last month, showing the most recent call
     is more useful than nothing. The usage card carries the
     this-month framing separately. */
  try {
    const result = (await sql`
      SELECT intent AS preset, area, score, created_at
      FROM reports
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `) as Array<LatestCall>;
    return result[0] ?? null;
  } catch {
    return null;
  }
}

async function getPrimaryApiKey(userId: string): Promise<PrimaryApiKey | null> {
  /* Primary key = first non-revoked key sorted by created_at asc.
     A returning user might have many; the Home only shows one. The
     full /api-usage surface is where they manage the rest. */
  try {
    const result = (await sql`
      SELECT key_prefix, name, last_used_at
      FROM api_keys
      WHERE user_id = ${userId} AND revoked = FALSE
      ORDER BY created_at ASC
      LIMIT 1
    `) as Array<{
      key_prefix: string | null;
      name: string;
      last_used_at: string | null;
    }>;
    return result[0] ?? null;
  } catch {
    return null;
  }
}

async function getEmailVerified(userId: string): Promise<boolean> {
  try {
    const result = (await sql`
      SELECT email_verified FROM users WHERE id = ${userId} LIMIT 1
    `) as Array<{ email_verified: boolean }>;
    return result[0]?.email_verified ?? false;
  } catch {
    return true;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/get-started?callbackUrl=/dashboard");

  const [
    plan,
    used,
    mcpAccess,
    mcpAddonOwned,
    primaryKey,
    emailVerified,
    latestCall,
  ] = await Promise.all([
    getUserPlan(userId),
    getMonthlyReportCount(userId),
    hasMcpAccess(userId),
    hasAddon(userId, "mcp"),
    getPrimaryApiKey(userId),
    getEmailVerified(userId),
    getLatestCall(userId),
  ]);

  const planConfig = PLANS[plan];
  const planIncludesMcp = planConfig?.mcpAccess === true;

  return (
    <DashboardHomeClient
      email={session?.user?.email ?? ""}
      emailVerified={emailVerified}
      primaryKey={primaryKey}
      latestCall={latestCall}
      plan={plan}
      planName={planConfig?.name ?? "Sandbox"}
      used={used}
      limit={planConfig?.reportsPerMonth ?? 35}
      mcp={{
        access: mcpAccess,
        addonOwned: mcpAddonOwned,
        includedFreeViaPlan: planIncludesMcp,
      }}
    />
  );
}
