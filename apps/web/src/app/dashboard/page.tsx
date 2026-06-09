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

  const [plan, used, mcpAccess, mcpAddonOwned, primaryKey, emailVerified] =
    await Promise.all([
      getUserPlan(userId),
      getMonthlyReportCount(userId),
      hasMcpAccess(userId),
      hasAddon(userId, "mcp"),
      getPrimaryApiKey(userId),
      getEmailVerified(userId),
    ]);

  const planConfig = PLANS[plan];
  const planIncludesMcp = planConfig?.mcpAccess === true;

  return (
    <DashboardHomeClient
      email={session?.user?.email ?? ""}
      emailVerified={emailVerified}
      primaryKey={primaryKey}
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
