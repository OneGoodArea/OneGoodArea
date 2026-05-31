import type { Metadata } from "next";
import ProductScoresClient from "./client";

export const metadata: Metadata = {
  title: "Scores | OneGoodArea (Design V2)",
  description:
    "Design V2 preview: deterministic composite scoring for UK areas. Four presets, configurable weights, engine version stamped.",
  robots: { index: false, follow: false },
};

export default function DesignV2ProductScoresPage() {
  return <ProductScoresClient />;
}
