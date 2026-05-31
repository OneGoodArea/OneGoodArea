import type { Metadata } from "next";
import ForInsuranceClient from "./client";

export const metadata: Metadata = {
  title: "OneGoodArea for insurance + InsureTech | UK area-risk API (Design V2)",
  description:
    "Design V2 preview: configurable composite scoring with per-dimension confidence, continuous portfolio drift detection with signed webhooks, peer-relative anomaly screening.",
  robots: { index: false, follow: false },
};

export default function DesignV2ForInsurancePage() {
  return <ForInsuranceClient />;
}
