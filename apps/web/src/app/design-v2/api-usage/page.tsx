import type { Metadata } from "next";
import ApiUsageClient from "./client";

export const metadata: Metadata = {
  title: "API usage | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2ApiUsagePage() {
  return <ApiUsageClient />;
}
