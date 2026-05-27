import type { Metadata } from "next";
import HelpClient from "./client";

export const metadata: Metadata = {
  title: "Help & Support | OneGoodArea (Design V2)",
  description: "Design V2 preview: get help with OneGoodArea area intelligence reports, billing, API access, and account questions.",
  robots: { index: false, follow: false },
};

export default function DesignV2HelpPage() {
  return <HelpClient />;
}
