import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/server/api-client";
import AdminClient from "@/app/design-v2/admin/client";
import type { Analytics, TrafficData } from "@/app/design-v2/admin/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Analytics | OneGoodArea",
};

const ADMIN_EMAILS = ["ptengelmann@gmail.com"];

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
      analytics={analyticsRes.data as Analytics | null}
      traffic={trafficRes.data as TrafficData | null}
    />
  );
}
