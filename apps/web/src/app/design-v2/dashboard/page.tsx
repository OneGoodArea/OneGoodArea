import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getUserPlan, getMonthlyReportCount } from "@/lib/usage";
import { PLANS } from "@/lib/stripe";
import { rows, type ReportRow, type SavedAreaRow } from "@/lib/db-types";
import DashboardClient from "./client";

export const metadata: Metadata = {
  title: "Dashboard | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

async function getUserReports(userId: string) {
  const result = await sql`
    SELECT id, area, intent, score, created_at
    FROM reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  const typed = rows<ReportRow>(result);
  return typed.map((r) => ({ id: r.id, area: r.area, intent: r.intent, score: r.score, created_at: r.created_at }));
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
    return typed.map((r) => ({ id: r.id, postcode: r.postcode, label: r.label || "", intent: r.intent || null, created_at: r.created_at }));
  } catch {
    return [];
  }
}

export default async function DesignV2DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/dashboard");

  const [reports, plan, used, savedAreas] = await Promise.all([
    getUserReports(userId),
    getUserPlan(userId),
    getMonthlyReportCount(userId),
    getSavedAreas(userId),
  ]);
  const planConfig = PLANS[plan];

  return (
    <DashboardClient
      reports={reports}
      plan={plan}
      planName={planConfig.name}
      used={used}
      limit={planConfig.reportsPerMonth}
      savedAreas={savedAreas}
    />
  );
}
