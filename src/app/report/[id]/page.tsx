import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { AreaReport } from "@/lib/types";
import { ReportView } from "@/components/report-view";
import { ReportPageClient } from "./client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

async function getReport(id: string) {
  const rows = await sql`
    SELECT id, area, intent, report, score, created_at
    FROM reports
    WHERE id = ${id}
  `;

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id as string,
    area: row.area as string,
    intent: row.intent as string,
    report: (typeof row.report === "string" ? JSON.parse(row.report) : row.report) as AreaReport,
    score: row.score as number,
    created_at: row.created_at as string,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) {
    return { title: "Report Not Found | AreaIQ" };
  }

  return {
    title: `${data.area} | ${data.intent} Report | AreaIQ`,
    description: data.report.summary,
    openGraph: {
      title: `${data.area} | AreaIQ Score: ${data.score}/100`,
      description: data.report.summary,
      type: "article",
    },
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) notFound();

  return <ReportPageClient report={data.report} id={data.id} />;
}
