import type { Metadata } from "next";
import ProductMonitorClient from "./client";

export const metadata: Metadata = {
  title: "Monitor | OneGoodArea (Design V2)",
  description:
    "Design V2 preview: portfolios plus on-demand change detection plus signed webhooks for UK area signals.",
  robots: { index: false, follow: false },
};

export default function DesignV2ProductMonitorPage() {
  return <ProductMonitorClient />;
}
