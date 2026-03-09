import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import { AreaReport } from "@/lib/types";
import { ReportPageClient } from "./client";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/usage";
import type { Metadata } from "next";
import type { PlanId } from "@/lib/stripe";

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
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AreaIQ - UK Area Intelligence" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.area} | AreaIQ Score: ${data.score}/100`,
      description: data.report.summary,
      images: ["/opengraph-image"],
    },
  };
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) notFound();

  let plan: PlanId = "free";
  try {
    const session = await auth();
    if (session?.user?.id) {
      plan = await getUserPlan(session.user.id);
    }
  } catch {}

  return <ReportPageClient report={data.report} id={data.id} plan={plan} />;
}
