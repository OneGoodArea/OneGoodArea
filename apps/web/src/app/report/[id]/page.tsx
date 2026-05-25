import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { AreaReport } from "@/lib/types";
import ReportViewClient from "@/app/design-v2/report/[id]/client";
import type { Metadata } from "next";
import { row as typedRow, ReportRow } from "@/lib/db-types";

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

  const r = typedRow<ReportRow>(rows[0]);
  return {
    id: r.id,
    area: r.area,
    intent: r.intent,
    report: (typeof r.report === "string" ? JSON.parse(r.report) : r.report) as AreaReport,
    score: r.score,
    created_at: r.created_at,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) {
    return { title: "Report Not Found | OneGoodArea" };
  }

  return {
    title: `${data.area} | ${data.intent} Report | OneGoodArea`,
    description: data.report.summary,
    openGraph: {
      title: `${data.area} | OneGoodArea Score: ${data.score}/100`,
      description: data.report.summary,
      type: "article",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "OneGoodArea - UK Area Intelligence" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.area} | OneGoodArea Score: ${data.score}/100`,
      description: data.report.summary,
      images: ["/opengraph-image"],
    },
    alternates: {
      canonical: `https://www.onegoodarea.com/report/${id}`,
    },
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) notFound();

  return <ReportViewClient id={data.id} report={data.report} score={data.score} createdAt={data.created_at} />;
}
