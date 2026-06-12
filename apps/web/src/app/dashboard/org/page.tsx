import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrgSettingsClient from "@/app/design-v2/dashboard-org/client";

/* AR-284 /dashboard/org. Landing/settings surface for the org itself
   (peer to /dashboard/org/{members,bundles,presets,cohorts} which
   manage children of the org). Server component is thin: auth gate
   then render the client; data is fetched client-side from
   /api/me/org. */

export const metadata: Metadata = {
  title: "Organisation | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/org");
  }
  return <OrgSettingsClient />;
}
