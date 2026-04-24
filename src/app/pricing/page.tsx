import type { Metadata } from "next";
import PricingClient from "@/app/design-v2/pricing/client";

export const metadata: Metadata = {
  title: "Pricing | OneGoodArea",
  description: "Simple, transparent pricing for OneGoodArea. Web reports from £0/mo. API access from £49/mo. No hidden fees, cancel anytime.",
  openGraph: {
    title: "Pricing | OneGoodArea",
    description: "Web reports from £0/mo, API access from £49/mo. No hidden fees, cancel anytime.",
    type: "website",
    url: "https://www.area-iq.co.uk/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Pricing | OneGoodArea", description: "Web reports from £0/mo, API access from £49/mo." },
  alternates: { canonical: "https://www.area-iq.co.uk/pricing" },
};

export default function Pricing() {
  return <PricingClient />;
}
