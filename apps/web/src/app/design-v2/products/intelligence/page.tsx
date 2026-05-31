import type { Metadata } from "next";
import ProductIntelligenceClient from "./client";

export const metadata: Metadata = {
  title: "Intelligence | OneGoodArea (Design V2)",
  description:
    "Design V2 preview: typed query plane over UK area data. Six plan ops, dual mode (programmatic plan or natural-language question), 92.9% planner accuracy on a 14-case curated corpus.",
  robots: { index: false, follow: false },
};

export default function DesignV2ProductIntelligencePage() {
  return <ProductIntelligenceClient />;
}
