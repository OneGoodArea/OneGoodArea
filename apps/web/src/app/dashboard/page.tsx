import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserPlan, getMonthlyReportCount, hasMcpAccess, hasAddon, getMcpUsageThisMonth } from "@/lib/usage";
import { PLANS } from "@/lib/stripe";
import DashboardClient from "@/app/design-v2/dashboard/client";
import { rows, ReportRow, SavedAreaRow } from "@/lib/db-types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Reports | OneGoodArea",
  description: "View your generated area intelligence reports.",
};

async function getUserReports(userId: string) {
  const result = await sql`
    SELECT id, area, intent, score, created_at
    FROM reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  const typed = rows<ReportRow>(result);

  return typed.map((row) => ({
    id: row.id,
    area: row.area,
    intent: row.intent,
    score: row.score,
    created_at: row.created_at,
  }));
}

async function getSavedAreas(userId: string) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS saved_areas (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL,
        postcode TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        intent TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, postcode)
      )
    `;
    const result = await sql`
      SELECT id, postcode, label, intent, created_at
      FROM saved_areas
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    const typed = rows<SavedAreaRow>(result);
    return typed.map((row) => ({
      id: row.id,
      postcode: row.postcode,
      label: row.label || "",
      intent: row.intent || null,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in");

  const [reports, plan, used, savedAreas, mcpAccess, mcpAddonOwned, mcpUsage] = await Promise.all([
    getUserReports(userId),
    getUserPlan(userId),
    getMonthlyReportCount(userId),
    getSavedAreas(userId),
    hasMcpAccess(userId),
    hasAddon(userId, "mcp"),
    getMcpUsageThisMonth(userId),
  ]);

  const planConfig = PLANS[plan];
  const planIncludesMcp = planConfig?.mcpAccess === true;

  return (
    <DashboardClient
      reports={reports}
      plan={plan}
      planName={planConfig.name}
      used={used}
      limit={planConfig.reportsPerMonth}
      savedAreas={savedAreas}
      mcp={{
        access: mcpAccess,
        addonOwned: mcpAddonOwned,
        includedFreeViaPlan: planIncludesMcp,
        callsThisMonth: mcpUsage,
      }}
    />
  );
}
