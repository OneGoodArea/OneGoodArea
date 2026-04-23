import type { Metadata } from "next";
import BusinessClient from "./client";

export const metadata: Metadata = {
  title: "For businesses | OneGoodArea (Design V2)",
  description: "Design V2 preview — area intelligence API + embeddable widget for property, relocation, and investment platforms.",
  robots: { index: false, follow: false },
};

export default function DesignV2BusinessPage() {
  return <BusinessClient />;
}
