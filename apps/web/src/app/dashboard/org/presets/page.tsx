import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PresetsClient from "@/app/design-v2/dashboard-presets/client";

/* AR-276 /dashboard/org/presets. Replaces the AR-252 ComingSoonPage.
   Server component is thin: auth-gate then render the presets client. */

export const metadata: Metadata = {
  title: "Scoring presets | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/org/presets");
  }
  return <PresetsClient />;
}
