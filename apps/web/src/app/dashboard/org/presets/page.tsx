import type { Metadata } from "next";
import ComingSoonPage from "@/app/design-v2/_shared/dashboard/coming-soon-page";

export const metadata: Metadata = {
  title: "Scoring presets | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ComingSoonPage
      pageTitle="Scoring presets"
      phase="Phase 3 — Levers"
      title="Custom scoring presets"
      description="Beyond the four built-in profiles (moving, business, investing, research), define your own dimension weights as a named preset — slug it, version it, share it across the org. Pass the slug as preset_id on any /v1/score call."
    />
  );
}
