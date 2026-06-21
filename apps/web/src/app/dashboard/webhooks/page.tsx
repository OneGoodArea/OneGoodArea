import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import WebhooksClient from "@/app/design-v2/dashboard-webhooks/client";

/* AR-281 /dashboard/webhooks. Replaces the Phase 4 ComingSoonPage
   placeholder. Thin auth-gate, then render the webhooks client. */

export const metadata: Metadata = {
  title: "Webhooks | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/webhooks");
  }
  return <WebhooksClient />;
}
