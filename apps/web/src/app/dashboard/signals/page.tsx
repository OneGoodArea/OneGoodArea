import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Signals | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Signals"
      phase="Phase 2"
      title="Signals catalogue"
      description="Browse the 47 normalised property signals you can query from /v1/signals. Filter by source (ONS, Land Registry, TfL, Police.uk, etc.), by refresh cadence, by coverage geometry. Each signal shows its OpenAPI contract, sample response, and freshness."
    />
  );
}
