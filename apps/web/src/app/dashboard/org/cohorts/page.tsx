import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Peer cohorts | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Peer cohorts"
      phase="Phase 3 — Levers"
      title="Peer cohorts"
      description="Define a comparison set — postcodes that resemble each other on the dimensions you care about. Use cohorts to benchmark an area against its peers rather than the national average. Saved cohorts plug into /v1/peers, /v1/score and the dashboard's comparison views."
    />
  );
}
