import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/server/api-client";
import AdminClient from "@/app/design-v2/admin/client";
import type { Analytics, TrafficData } from "@/app/design-v2/admin/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Analytics | OneGoodArea",
};

/* AR-313 Phase 0: gate is DB-backed via users.is_superuser (AR-312).
   The previous hardcoded ADMIN_EMAILS list is gone — toggling admin
   access is now a single UPDATE, no deploy. */
export default async function AdminPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/admin");

  const { data: gate } = await callApi<{ is_superuser: boolean }>(
    "/me/is-superuser",
    { userId },
  );
  if (!gate?.is_superuser) redirect("/dashboard");

  const [analyticsRes, trafficRes] = await Promise.all([
    callApi("/admin/analytics", { userId }),
    callApi("/admin/traffic-analytics", { userId }),
  ]);

  return (
    <AdminClient
      analytics={analyticsRes.data as Analytics | null}
      traffic={trafficRes.data as TrafficData | null}
    />
  );
}
