import type { Metadata } from "next";
import Script from "next/script";
import { METHODOLOGY_VERSION } from "@onegoodarea/contracts";
import MethodologyClient from "@/app/design-v2/methodology/client";

export const metadata: Metadata = {
  title: "Scoring Methodology | OneGoodArea",
  description: "How OneGoodArea scores areas: transparent formulas applied to 7 live UK data sources. Same postcode, same score, every time.",
  openGraph: {
    title: "Scoring Methodology | OneGoodArea",
    description: "Transparent scoring applied to 7 live UK data sources. Same postcode, same score, every time.",
    type: "article",
    url: "https://www.onegoodarea.com/methodology",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Scoring Methodology | OneGoodArea", description: "Transparent scoring applied to 7 live UK data sources." },
  alternates: { canonical: "https://www.onegoodarea.com/methodology" },
};

/* Dataset schema (AR-780). The on-thesis structured-data type for a data
   company: it declares the UK area dataset to Google Dataset Search and to
   agents. version is imported from @onegoodarea/contracts so it never drifts.
   Grounded in published facts (LSOA grain, named sources, seven categories). */
const datasetLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "OneGoodArea UK area intelligence",
  description:
    "Structured signals for UK areas across seven categories (safety and crime, deprivation, property, schools, amenities, transport, environment) at LSOA-by-month grain. Every value carries its named public source, observed period, and confidence, and is scored deterministically with the engine version stamped on every result.",
  url: "https://www.onegoodarea.com/methodology",
  creator: {
    "@type": "Organization",
    name: "OneGoodArea",
    url: "https://www.onegoodarea.com",
  },
  spatialCoverage: {
    "@type": "Place",
    name: "England, Wales, and Scotland",
  },
  variableMeasured: [
    "safety and crime",
    "deprivation",
    "property",
    "schools",
    "amenities",
    "transport",
    "environment",
  ],
  version: METHODOLOGY_VERSION,
  isAccessibleForFree: false,
  distribution: [
    {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: "https://www.onegoodarea.com/openapi.json",
    },
  ],
  keywords: [
    "UK area data",
    "postcode data",
    "LSOA",
    "area intelligence",
    "property data",
  ],
};

/* TechArticle schema (AR-780): marks the methodology as authoritative
   technical documentation for search and for AI assistants. */
const techArticleLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "OneGoodArea scoring methodology",
  description:
    "How OneGoodArea scores UK areas: deterministic formulas over seven signal categories from named public sources, with per-value confidence and a version stamp on every result.",
  url: "https://www.onegoodarea.com/methodology",
  author: { "@type": "Organization", name: "OneGoodArea", url: "https://www.onegoodarea.com" },
  publisher: { "@type": "Organization", name: "OneGoodArea", url: "https://www.onegoodarea.com" },
};

export default function MethodologyPage() {
  return (
    <>
      <Script
        id="ld-dataset"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }}
      />
      <Script
        id="ld-techarticle-methodology"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleLd) }}
      />
      <MethodologyClient />
    </>
  );
}
