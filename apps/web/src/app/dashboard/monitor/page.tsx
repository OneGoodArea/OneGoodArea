import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Monitor | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Monitor"
      phase="Phase 2"
      title="Monitored portfolios"
      description="Watch a list of postcodes over time. Receive webhook deliveries when material change crosses your threshold — score deltas, signal-level breakouts, regeneration milestones, planning approvals. Backed by /v1/monitor and the existing alert/delivery infrastructure."
    />
  );
}
