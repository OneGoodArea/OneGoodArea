import type { Metadata } from "next";
import PricingClient from "@/app/design-v2/pricing/client";

export const metadata: Metadata = {
  title: "Pricing | OneGoodArea",
  description:
    "OneGoodArea is packaged around how your team uses UK area intelligence. Developer Sandbox (free evaluation), Build from £2,000/mo, Decision from £5,000/mo, and Assured (custom, audit-grade for regulated lending and underwriting). Annual contracts, 40-day pilots, demo-led.",
  keywords: [
    "OneGoodArea pricing",
    "UK area intelligence pricing",
    "property data platform pricing",
    "area scoring platform",
    "enterprise property data",
    "book a demo",
  ],
  openGraph: {
    title: "Pricing | OneGoodArea",
    description:
      "Packaged around how your team uses UK area intelligence. Developer Sandbox, Build, Decision, Assured. Annual contracts, 40-day pilots, demo-led.",
    type: "website",
    url: "https://www.onegoodarea.com/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | OneGoodArea",
    description:
      "Packaged around how your team uses UK area intelligence. Annual contracts, 40-day pilots, demo-led.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/pricing" },
};

export default function Pricing() {
  return <PricingClient />;
}
