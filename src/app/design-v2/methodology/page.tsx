import type { Metadata } from "next";
import MethodologyClient from "./client";

export const metadata: Metadata = {
  title: "Methodology | OneGoodArea (Design V2)",
  description: "Design V2 preview — how OneGoodArea scores UK postcodes.",
  robots: { index: false, follow: false },
};

export default function DesignV2MethodologyPage() {
  return <MethodologyClient />;
}
