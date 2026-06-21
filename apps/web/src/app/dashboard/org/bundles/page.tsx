import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BundlesClient from "@/app/design-v2/dashboard-bundles/client";

/* AR-274 /dashboard/org/bundles. Replaces the AR-252 ComingSoonPage
   placeholder. Server component is thin: auth gate then render the
   bundles client. */

export const metadata: Metadata = {
  title: "Signal bundles | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/org/bundles");
  }
  return <BundlesClient />;
}
