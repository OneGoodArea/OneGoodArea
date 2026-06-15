import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";
import AdminClient from "./client";
import type { Analytics, TrafficData, AudienceStats, UsageStats, RevenueExtras } from "./client";

export const metadata: Metadata = {
  title: "Admin | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

/* AR-313 Phase 0 + Phase 1: kept in sync with /admin/page.tsx so the
   design-v2 preview surface renders the same shape. Gate is DB-backed
   via users.is_superuser (AR-312); the previous hardcoded ADMIN_EMAILS
   list is gone. */
export default async function DesignV2AdminPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/design-v2/admin");

  const { data: gate } = await callApi<{ is_superuser: boolean }>(
    "/me/is-superuser",
    { userId },
  );
  if (!gate?.is_superuser) redirect("/dashboard");

  const [analyticsRes, trafficRes, audienceRes, usageRes, revenueRes] = await Promise.all([
    callApi("/admin/analytics", { userId }),
    callApi("/admin/traffic-analytics", { userId }),
    callApi("/admin/audience", { userId }),
    callApi("/admin/usage", { userId }),
    callApi("/admin/revenue", { userId }),
  ]);

  return (
    <AdminClient
      analytics={analyticsRes.ok ? (analyticsRes.data as Analytics) : null}
      traffic={trafficRes.ok ? (trafficRes.data as TrafficData) : null}
      audience={audienceRes.ok ? (audienceRes.data as AudienceStats) : null}
      usage={usageRes.ok ? (usageRes.data as UsageStats) : null}
      revenue={revenueRes.ok ? (revenueRes.data as RevenueExtras) : null}
    />
  );
}
