import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Intelligence | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Intelligence"
      phase="Phase 2"
      title="Intelligence queries"
      description="Natural-language queries over normalised signals (/v1/query) with full traceability — every fact in the answer cites the signal + source + dimension contribution it came from. No black-box LLM summaries. Save queries, share them across the org, run them on a schedule."
    />
  );
}
