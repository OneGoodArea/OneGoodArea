import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MonitorClient from "@/app/design-v2/dashboard-monitor/client";

/* AR-261 /dashboard/monitor. Replaces the AR-252 ComingSoonPage
   placeholder. Server component is thin: auth-gate then render the
   monitor client. MVP runs on prebaked fixtures (3 portfolios);
   live /v1/portfolios integration is a follow-up. */

export const metadata: Metadata = {
  title: "Monitor | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/monitor");
  }
  return <MonitorClient />;
}
