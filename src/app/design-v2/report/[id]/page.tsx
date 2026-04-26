import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { row as typedRow, type ReportRow } from "@/lib/db-types";
import type { AreaReport } from "@/lib/types";
import ReportViewClient from "./client";

interface Props {
  params: Promise<{ id: string }>;
}

async function getReport(id: string) {
  const result = await sql`
    SELECT id, area, intent, report, score, created_at
    FROM reports
    WHERE id = ${id}
  `;
  if (result.length === 0) return null;
  const r = typedRow<ReportRow>(result[0]);
  return {
    id: r.id, area: r.area, intent: r.intent,
    report: (typeof r.report === "string" ? JSON.parse(r.report) : r.report) as AreaReport,
    score: r.score, created_at: r.created_at,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getReport(id);
  if (!data) return { title: "Report not found | OneGoodArea (Design V2)", robots: { index: false, follow: false } };
  return {
    title: `${data.area} · ${data.intent} | OneGoodArea (Design V2)`,
    description: data.report.summary,
    robots: { index: false, follow: false },
  };
}

export default async function DesignV2ReportPage({ params }: Props) {
  const { id } = await params;
  const data = await getReport(id);
  if (!data) notFound();
  return <ReportViewClient id={data.id} report={data.report} score={data.score} createdAt={data.created_at} />;
}
