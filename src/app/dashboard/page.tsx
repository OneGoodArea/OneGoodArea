import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserPlan, getMonthlyReportCount } from "@/lib/usage";
import { PLANS } from "@/lib/stripe";
import { DashboardClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Reports | AreaIQ",
  description: "View your generated area intelligence reports.",
};

async function getUserReports(userId: string) {
  const rows = await sql`
    SELECT id, area, intent, score, created_at
    FROM reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id as string,
    area: row.area as string,
    intent: row.intent as string,
    score: row.score as number,
    created_at: row.created_at as string,
  }));
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in");

  const [reports, plan, used] = await Promise.all([
    getUserReports(userId),
    getUserPlan(userId),
    getMonthlyReportCount(userId),
  ]);

  const planConfig = PLANS[plan];

  return (
    <DashboardClient
      reports={reports}
      plan={plan}
      planName={planConfig.name}
      used={used}
      limit={planConfig.reportsPerMonth}
    />
  );
}
