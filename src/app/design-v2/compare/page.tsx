import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getUserPlan } from "@/lib/usage";
import { rows as typedRows, type ReportRow } from "@/lib/db-types";
import type { AreaReport } from "@/lib/types";
import CompareClient from "./client";

export const metadata: Metadata = {
  title: "Compare | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

async function getFullReports(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const rawRows = await sql`
    SELECT id, area, intent, report, score, created_at
    FROM reports
    WHERE user_id = ${userId} AND id = ANY(${ids})
    ORDER BY created_at DESC
  `;
  return typedRows<ReportRow>(rawRows).map((r) => ({
    id: r.id, area: r.area, intent: r.intent,
    report: (typeof r.report === "string" ? JSON.parse(r.report) : r.report) as AreaReport,
    score: r.score, created_at: r.created_at,
  }));
}

async function getUserReports(userId: string) {
  const rawRows = await sql`
    SELECT id, area, intent, score, created_at
    FROM reports
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return typedRows<ReportRow>(rawRows).map((r) => ({
    id: r.id, area: r.area, intent: r.intent, score: r.score, created_at: r.created_at,
  }));
}

export default async function DesignV2ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ reports?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/compare");
  const plan = await getUserPlan(userId);
  if (plan === "free") redirect("/pricing");

  const params = await searchParams;
  const reportIds = params.reports?.split(",").filter(Boolean) || [];
  const [selected, all] = await Promise.all([
    getFullReports(userId, reportIds),
    getUserReports(userId),
  ]);

  return <CompareClient selected={selected} all={all} />;
}
