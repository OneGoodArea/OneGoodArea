import type { Metadata } from "next";
import PrivacyClient from "./client";

export const metadata: Metadata = {
  title: "Privacy Policy | OneGoodArea (Design V2)",
  description: "Design V2 preview: Privacy Policy for OneGoodArea under UK GDPR and the Data Protection Act 2018.",
  robots: { index: false, follow: false },
};

export default function DesignV2PrivacyPage() {
  return <PrivacyClient />;
}
