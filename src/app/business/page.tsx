import type { Metadata } from "next";
import BusinessClient from "@/app/design-v2/business/client";

export const metadata: Metadata = {
  title: "B2B Area Intelligence API | OneGoodArea",
  description: "Embed UK area intelligence in your product. REST API and embeddable widget for property portals, relocation platforms, and investment tools.",
  openGraph: {
    title: "B2B Area Intelligence API | OneGoodArea",
    description: "Embed UK area intelligence in your product. REST API and embeddable widget for property portals and investment tools.",
    type: "website",
    url: "https://www.onegoodarea.com/business",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "B2B Area Intelligence API | OneGoodArea", description: "Embed UK area intelligence in your product." },
  alternates: { canonical: "https://www.onegoodarea.com/business" },
};

export default function Business() {
  return <BusinessClient />;
}
