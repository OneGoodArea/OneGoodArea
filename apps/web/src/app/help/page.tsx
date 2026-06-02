import type { Metadata } from "next";
import Script from "next/script";
import HelpClient from "@/app/design-v2/help/client";
import { TOPICS } from "@/app/design-v2/help/topics";

export const metadata: Metadata = {
  title: "Help & FAQs — OneGoodArea",
  description:
    "FAQs across Signals, Scores, Monitor, Intelligence, methodology, API access, billing, and account management. Verified pricing, rate limits, and engine version. Search across every answer.",
  keywords: [
    "OneGoodArea help",
    "UK area data API FAQ",
    "area scoring API help",
    "API rate limits OneGoodArea",
    "OneGoodArea pricing",
    "MCP add-on",
    "engine version pinning",
    "fetch_mode signals",
  ],
  openGraph: {
    title: "Help & FAQs — OneGoodArea",
    description:
      "FAQs across Signals, Scores, Monitor, Intelligence, methodology, API access, billing, and account management.",
    type: "website",
    url: "https://www.onegoodarea.com/help",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Help & FAQs — OneGoodArea",
    description:
      "FAQs across Signals, Scores, Monitor, Intelligence, methodology, API access, billing, and account management.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/help" },
};

/* Schema.org FAQPage structured data — built from the same TOPICS
   source as the visible client. Both stay in sync because the Q&A
   data lives in apps/web/src/app/design-v2/help/topics.ts and is
   imported in two places. */
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: TOPICS.flatMap((topic) =>
    topic.items.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.a,
      },
    })),
  ),
};

export default function HelpPage() {
  return (
    <>
      <Script
        id="ld-faq-help"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <HelpClient />
    </>
  );
}
