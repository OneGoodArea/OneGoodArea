import type { Metadata } from "next";
import HelpClient from "@/app/design-v2/help/client";

export const metadata: Metadata = {
  title: "Help & Support | OneGoodArea",
  description: "Get help with OneGoodArea: area intelligence reports, billing, API access, and more. FAQs on scoring, data sources, plans, and API keys.",
  openGraph: {
    title: "Help & Support | OneGoodArea",
    description: "Get help with OneGoodArea: area intelligence reports, billing, API access, and more.",
    type: "website",
    url: "https://www.area-iq.co.uk/help",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Help & Support | OneGoodArea", description: "Get help with OneGoodArea: area intelligence reports, billing, API access, and more." },
  alternates: { canonical: "https://www.area-iq.co.uk/help" },
};

export default function HelpPage() {
  return <HelpClient />;
}
