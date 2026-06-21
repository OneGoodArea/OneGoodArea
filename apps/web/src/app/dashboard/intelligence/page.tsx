import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import IntelligenceCatalogueClient from "@/app/design-v2/dashboard-intelligence/client";

/* AR-264 /dashboard/intelligence catalogue. Replaces the ComingSoonPage
   stub. Server component is thin: auth-gate then render the catalogue
   client (static reference content — no fetches). Customers run real
   queries from their own code against POST /v1/query; the dashboard's
   job is reference material + management, matching the Signals/Scores
   pattern. */

export const metadata: Metadata = {
  title: "Intelligence | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/intelligence");
  }
  return <IntelligenceCatalogueClient />;
}
