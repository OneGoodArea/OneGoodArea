import type { Metadata } from "next";
import DesignV2Client from "@/app/design-v2/client";

export const metadata: Metadata = {
  title: "OneGoodArea | The UK area intelligence API",
  description: "One API for UK area data: comparables, forecasts, scores, and monitoring across multiple public sources. Versioned and replayable, so the numbers never move under you. Works in your workflows and AI tools. Free playground.",
  openGraph: {
    title: "OneGoodArea | The UK area intelligence API",
    description: "One API for UK area data: comparables, forecasts, scores, and monitoring. Versioned and replayable. Works in your workflows and AI tools.",
    type: "website",
    url: "https://www.onegoodarea.com",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea | The UK area intelligence API",
    description: "One API for UK area comparables, forecasts, scores, and monitoring. Versioned, replayable, works in your workflows and AI tools.",
  },
  alternates: { canonical: "https://www.onegoodarea.com" },
};

function WebSiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "OneGoodArea",
          url: "https://www.onegoodarea.com",
        }),
      }}
    />
  );
}

export default function Home() {
  return (
    <>
      <WebSiteJsonLd />
      <DesignV2Client />
    </>
  );
}
