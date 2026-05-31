import type { Metadata } from "next";
import ProductSignalsClient from "./client";

export const metadata: Metadata = {
  title: "Signals | OneGoodArea (Design V2)",
  description:
    "Design V2 preview: the deterministic UK area-data layer at LSOA × month grain.",
  robots: { index: false, follow: false },
};

export default function DesignV2ProductSignalsPage() {
  return <ProductSignalsClient />;
}
