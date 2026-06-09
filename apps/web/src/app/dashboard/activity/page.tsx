import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Recent activity | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Recent activity"
      phase="Phase 1"
      title="Recent activity"
      description="A reverse-chronological feed of API calls, signal updates, score changes on watched areas, webhook deliveries, and member actions. Filter by signal type, by member, by area. Lands with the dashboard Home redesign."
    />
  );
}
