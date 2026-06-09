import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Scores | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Scores"
      phase="Phase 2"
      title="Scoring workbench"
      description="The 0–100 area-quality score, broken open. Try presets (residential origination, commercial site selection, investment underwrite, research baseline) against any postcode, inspect the dimension breakdown, view confidence + freshness per dimension. Same call your code makes against /v1/score."
    />
  );
}
