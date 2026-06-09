import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Signal bundles | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Signal bundles"
      phase="Phase 3 — Levers"
      title="Signal bundles"
      description="Curate the subset of normalised signals your org cares about, save as a named bundle, and route every /v1/score and /v1/query call through it by default. One source of truth — when the bundle changes, every consumer in your stack picks it up."
    />
  );
}
