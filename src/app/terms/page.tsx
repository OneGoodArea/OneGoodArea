import type { Metadata } from "next";
import TermsClient from "@/app/design-v2/terms/client";

export const metadata: Metadata = {
  title: "Terms of Service | OneGoodArea",
  description: "Terms of Service for OneGoodArea, the UK area intelligence platform. Covers account usage, subscriptions, API access, data accuracy, and governing law.",
  openGraph: {
    title: "Terms of Service | OneGoodArea",
    description: "Terms of Service for OneGoodArea, the UK area intelligence platform.",
    type: "article",
    url: "https://www.area-iq.co.uk/terms",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Terms of Service | OneGoodArea" },
  alternates: { canonical: "https://www.area-iq.co.uk/terms" },
};

export default function TermsPage() {
  return <TermsClient />;
}
