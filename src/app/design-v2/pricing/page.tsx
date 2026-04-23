import type { Metadata } from "next";
import PricingClient from "./client";

export const metadata: Metadata = {
  title: "Pricing | OneGoodArea (Design V2)",
  description: "Design V2 preview — OneGoodArea pricing for web reports and API access.",
  robots: { index: false, follow: false },
};

export default function DesignV2PricingPage() {
  return <PricingClient />;
}
