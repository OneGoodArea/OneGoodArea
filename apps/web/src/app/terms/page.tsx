import type { Metadata } from "next";
import TermsClient from "@/app/design-v2/terms/client";

export const metadata: Metadata = {
  title: "Terms of Service — OneGoodArea",
  description:
    "Terms governing use of OneGoodArea, the UK area intelligence layer. Covers account, subscriptions across the six V2 tiers, API access on every plan, soft and hard caps, data accuracy disclaimer, and English-law jurisdiction.",
  openGraph: {
    title: "Terms of Service — OneGoodArea",
    description:
      "Terms governing use of OneGoodArea, the UK area intelligence layer.",
    type: "article",
    url: "https://www.onegoodarea.com/terms",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service — OneGoodArea",
  },
  alternates: { canonical: "https://www.onegoodarea.com/terms" },
};

export default function TermsPage() {
  return <TermsClient />;
}
