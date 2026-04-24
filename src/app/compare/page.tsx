import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/usage";
import { AreaReport } from "@/lib/types";
import CompareClient from "@/app/design-v2/compare/client";
import { rows as typedRows } from "@/lib/db-types";
import type { ReportRow } from "@/lib/db-types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Areas | OneGoodArea",
  description: "Side-by-side area intelligence comparison.",
};

interface ReportData {
  id: string;
  area: string;
  intent: string;
  report: AreaReport;
  score: number;
  created_at: string;
}

interface ReportSummary {
  id: string;
  area: string;
  intent: string;
  score: number;
  created_at: string;
}

async function getFullReports(userId: string, ids: string[]): Promise<ReportData[]> {
  if (ids.length === 0) return [];

  const rawRows = await sql`
    SELECT id, area, intent, report, score, created_at
    FROM reports
    WHERE user_id = ${userId} AND id = ANY(${ids})
    ORDER BY created_at DESC
  `;

  return typedRows<ReportRow>(rawRows).map((row) => ({
    id: row.id,
    area: row.area,
    intent: row.intent,
    report: (typeof row.report === "string" ? JSON.parse(row.report) : row.report) as AreaReport,
    score: row.score,
    created_at: row.created_at,
  }));
}

async function getUserReportsList(userId: string): Promise<ReportSummary[]> {
  const rawRows = await sql`
    SELECT id, area, intent, score, created_at
    FROM reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return typedRows<ReportRow>(rawRows).map((row) => ({
    id: row.id,
    area: row.area,
    intent: row.intent,
    score: row.score,
    created_at: row.created_at,
  }));
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ reports?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in");

  const plan = await getUserPlan(userId);
  if (plan === "free") redirect("/pricing");

  const params = await searchParams;
  const reportIds = params.reports?.split(",").filter(Boolean) || [];

  const [selectedReports, allReports] = await Promise.all([
    getFullReports(userId, reportIds),
    getUserReportsList(userId),
  ]);

  return (
    <CompareClient
      selected={selectedReports}
      all={allReports}
    />
  );
}
