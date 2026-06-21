import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ActivityClient from "@/app/design-v2/dashboard-activity/client";

/* AR-257 /dashboard/activity. Server component: auth gate, render
   client. The client fetches /api/me/activity itself (paginated via
   query params + state), so the page.tsx stays thin. */

export const metadata: Metadata = {
  title: "Recent activity | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/activity");
  }
  return <ActivityClient />;
}
