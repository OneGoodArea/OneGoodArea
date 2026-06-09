import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Webhooks | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Webhooks"
      phase="Phase 4"
      title="Outbound webhooks"
      description="Configure outbound endpoints to receive area-quality events — score thresholds crossed, monitored portfolios changing materially, signal-level breakouts. Signed payloads (HMAC-SHA256), retries with exponential backoff, delivery log per event, rotate-secret + replay-failed actions."
    />
  );
}
