import type { Metadata } from "next";
import ForPublicSectorClient from "./client";

export const metadata: Metadata = {
  title: "OneGoodArea for public sector + research | UK area data API (Design V2)",
  description:
    "Design V2 preview: sourced, dated, methodology-stamped UK area metrics that survive FOI and procurement review.",
  robots: { index: false, follow: false },
};

export default function DesignV2ForPublicSectorPage() {
  return <ForPublicSectorClient />;
}
