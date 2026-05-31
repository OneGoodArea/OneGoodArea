import type { Metadata } from "next";
import Script from "next/script";
import ForProptechClient from "@/app/design-v2/for/proptech/client";

export const metadata: Metadata = {
  title: "OneGoodArea for PropTech — UK area data API for listing pages and property products",
  description:
    "Replace a dozen UK area-data integrations with one API key. LSOA-grain signals across seven categories with country-scoped percentiles, per-signal confidence, and source attribution. Built for portals, valuation tools, agent CRMs, and search products.",
  keywords: [
    "PropTech API",
    "UK area data",
    "property listing area data",
    "LSOA data API",
    "area intelligence API",
    "real estate area data",
    "property portal API",
  ],
  openGraph: {
    title: "OneGoodArea for PropTech — UK area data API",
    description:
      "Replace a dozen UK area-data integrations with one API key. LSOA-grain signals with country-scoped percentiles, per-signal confidence, and source attribution.",
    type: "website",
    url: "https://www.onegoodarea.com/for/proptech",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea for PropTech — UK area data API",
    description:
      "One API key. LSOA-grain signals with country-scoped percentiles and per-signal confidence. Built for portals, valuation tools, agent CRMs, and search products.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/for/proptech" },
};

/* FAQPage schema markup powers the FAQ-rich-result on Google. Mirrors
   the questions in /design-v2/for/proptech/client.tsx's FAQS array. */
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does the API scale to listing-page traffic?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Bearer-token API at /v1/area is rate-limited at 30 requests per minute per key. For higher-throughput listing-page traffic the typical pattern is to cache the AreaProfile per postcode at your edge and serve the JSON yourself.",
      },
    },
    {
      "@type": "Question",
      name: "What grain is the data at?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "LSOA by month. There are about 42,000 LSOAs across England, Wales, and Scotland; postcodes resolve into LSOAs via the ONS NSPL spine.",
      },
    },
    {
      "@type": "Question",
      name: "Can I show the numbers without attribution?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Each signal carries a source string (e.g. police.uk, IMD 2025) so you can render attribution next to the value. The OneGoodArea brand is not required on your listing pages unless your contract specifies it.",
      },
    },
    {
      "@type": "Question",
      name: "What happens when a postcode is in Scotland?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "fetch_mode is hybrid. Deprivation comes from SIMD, crime from police.uk, transport and amenities from OpenStreetMap. Property median price falls back to live fetch because HM Land Registry covers England and Wales only.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free tier for integration testing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pricing is being finalised. The /v1/area endpoint is rate-limited rather than monthly-quota-metered, which makes integration testing cheap. Get an API key and use it.",
      },
    },
  ],
};

export default function ForProptechPage() {
  return (
    <>
      <Script
        id="ld-faq-proptech"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ForProptechClient />
    </>
  );
}
