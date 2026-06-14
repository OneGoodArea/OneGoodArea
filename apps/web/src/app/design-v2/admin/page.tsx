import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";
import AdminClient from "./client";
import type { Analytics, TrafficData } from "./client";

export const metadata: Metadata = {
  title: "Admin | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

const ADMIN_EMAILS = ["ptengelmann@gmail.com"];

export default async function DesignV2AdminPage() {
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
