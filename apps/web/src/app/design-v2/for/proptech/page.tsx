import type { Metadata } from "next";
import ForProptechClient from "./client";

export const metadata: Metadata = {
  title: "OneGoodArea for PropTech | UK area data API (Design V2)",
  description:
    "Design V2 preview: drop one endpoint into your property listing pages and replace a dozen UK area-data integrations.",
  robots: { index: false, follow: false },
};

export default function DesignV2ForProptechPage() {
  return <ForProptechClient />;
}
