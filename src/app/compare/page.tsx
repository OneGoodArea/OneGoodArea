import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { getUserPlan } from "@/lib/usage";
import { AreaReport } from "@/lib/types";
import { CompareClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Areas | AreaIQ",
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

  const rows = await sql`
    SELECT id, area, intent, report, score, created_at
    FROM reports
    WHERE user_id = ${userId} AND id = ANY(${ids})
    ORDER BY created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id as string,
    area: row.area as string,
    intent: row.intent as string,
    report: (typeof row.report === "string" ? JSON.parse(row.report) : row.report) as AreaReport,
    score: row.score as number,
    created_at: row.created_at as string,
  }));
}

async function getUserReportsList(userId: string): Promise<ReportSummary[]> {
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
      selectedReports={selectedReports}
      allReports={allReports}
    />
  );
}
