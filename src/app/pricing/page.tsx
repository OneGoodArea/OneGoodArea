import type { Metadata } from "next";
import PricingClient from "@/app/design-v2/pricing/client";

export const metadata: Metadata = {
  title: "API pricing | OneGoodArea",
  description: "Deterministic UK location intelligence, priced per API call. Developer £49/mo, Business £249/mo, Growth £499/mo, Enterprise custom. Free sandbox tier. Cancel anytime.",
  openGraph: {
    title: "API pricing | OneGoodArea",
    description: "Developer £49/mo, Business £249/mo, Growth £499/mo, Enterprise custom. Free sandbox tier.",
    type: "website",
    url: "https://www.area-iq.co.uk/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "API pricing | OneGoodArea", description: "Developer £49/mo, Business £249/mo, Growth £499/mo, Enterprise custom." },
  alternates: { canonical: "https://www.area-iq.co.uk/pricing" },
};

export default function Pricing() {
  return <PricingClient />;
}
