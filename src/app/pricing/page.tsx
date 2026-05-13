import type { Metadata } from "next";
import PricingClient from "@/app/design-v2/pricing/client";

export const metadata: Metadata = {
  title: "API pricing | OneGoodArea",
  description: "Deterministic UK location intelligence, priced per API call. Sandbox free, Starter £49/mo, Build £149/mo, Scale £499/mo, Growth £1,499/mo, Enterprise from £4,999/mo. Cancel anytime.",
  openGraph: {
    title: "API pricing | OneGoodArea",
    description: "Sandbox free · Starter £49 · Build £149 · Scale £499 · Growth £1,499 · Enterprise from £4,999/mo.",
    type: "website",
    url: "https://www.onegoodarea.com/pricing",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "API pricing | OneGoodArea", description: "Sandbox free · Starter £49 · Build £149 · Scale £499 · Growth £1,499 · Enterprise from £4,999/mo." },
  alternates: { canonical: "https://www.onegoodarea.com/pricing" },
};

export default function Pricing() {
  return <PricingClient />;
}
