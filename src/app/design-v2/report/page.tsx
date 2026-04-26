import type { Metadata } from "next";
import ReportGeneratorClient from "./client";

export const metadata: Metadata = {
  title: "New report | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2ReportPage() {
  return <ReportGeneratorClient />;
}
