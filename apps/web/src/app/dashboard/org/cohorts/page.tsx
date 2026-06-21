import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CohortsClient from "@/app/design-v2/dashboard-cohorts/client";

/* AR-277 /dashboard/org/cohorts. Replaces the AR-252 ComingSoonPage.
   Thin auth-gate, then render the cohorts client. */

export const metadata: Metadata = {
  title: "Peer cohorts | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/org/cohorts");
  }
  return <CohortsClient />;
}
