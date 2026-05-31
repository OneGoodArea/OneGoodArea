import type { Metadata } from "next";
import ForCreClient from "./client";

export const metadata: Metadata = {
  title: "OneGoodArea for CRE + site selection | UK catchment-screening API (Design V2)",
  description:
    "Design V2 preview: compound multi-signal ranking across UK LSOAs in one typed call, peer-set discovery for your best-performing catchment, and a deterministic engine you can replay next quarter.",
  robots: { index: false, follow: false },
};

export default function DesignV2ForCrePage() {
  return <ForCreClient />;
}
