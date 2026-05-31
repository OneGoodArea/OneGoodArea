import type { Metadata } from "next";
import ForLendersClient from "./client";

export const metadata: Metadata = {
  title: "OneGoodArea for lenders | UK area data API (Design V2)",
  description:
    "Design V2 preview: versioned, pinnable area scoring for regulated underwriting. The engine version is stamped on every response; methodology pinning at the org level locks the numbers across deploys.",
  robots: { index: false, follow: false },
};

export default function DesignV2ForLendersPage() {
  return <ForLendersClient />;
}
