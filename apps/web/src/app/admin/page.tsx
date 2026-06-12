import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/server/api-client";
import AdminClient from "@/app/design-v2/admin/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Analytics | OneGoodArea",
};

const ADMIN_EMAILS = ["ptengelmann@gmail.com"];

interface TrafficData {
  totalPageviews: number;
  pageviewsToday: number;
  uniqueVisitorsToday: number;
  uniqueVisitors30d: number;
  pageviewsPerDay: { day: string; count: number }[];
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  topCountries: { country: string; count: number }[];
}

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email || !ADMIN_EMAILS.includes(email)) {
    redirect("/dashboard");
  }

  const userId = session?.user?.id!;

  const [analyticsRes, trafficRes] = await Promise.all([
    callApi("/admin/analytics", { userId }),
    callApi("/admin/traffic-analytics", { userId }),
  ]);

  return (
    <AdminClient
      analytics={analyticsRes.data ?? null}
      traffic={trafficRes.data as TrafficData | null}
    />
  );
}
