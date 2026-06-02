import type { Metadata } from "next";
import PricingClient from "@/app/design-v2/pricing/client";

export const metadata: Metadata = {
  title: "API pricing — OneGoodArea",
  description:
    "Six tiers on one engine, one methodology. Sandbox free with no card, Starter £49, Build £149, Scale £499, Growth £1,499, Enterprise from £4,999 per month. Soft caps with £0.05 overage on production tiers. MCP add-on at £29 per month (free on Growth and Enterprise).",
  keywords: [
    "OneGoodArea pricing",
    "UK area data API pricing",
    "area scoring API tiers",
    "MCP add-on",
    "API rate limit",
    "soft cap pricing",
    "Enterprise API contract",
  ],
  openGraph: {
    title: "API pricing — OneGoodArea",
    description:
      "Six tiers on one engine. Sandbox free, Starter £49, Build £149, Scale £499, Growth £1,499, Enterprise from £4,999 per month.",
    type: "website",
    url: "https://www.onegoodarea.com/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "API pricing — OneGoodArea",
    description:
      "Six tiers on one engine. Sandbox free, Starter £49, Build £149, Scale £499, Growth £1,499, Enterprise from £4,999/mo.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/pricing" },
};

export default function Pricing() {
  return <PricingClient />;
}
