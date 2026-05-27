import type { Metadata } from "next";
import TermsClient from "./client";

export const metadata: Metadata = {
  title: "Terms of Service | OneGoodArea (Design V2)",
  description: "Design V2 preview: Terms of Service for OneGoodArea, the UK area intelligence platform.",
  robots: { index: false, follow: false },
};

export default function DesignV2TermsPage() {
  return <TermsClient />;
}
