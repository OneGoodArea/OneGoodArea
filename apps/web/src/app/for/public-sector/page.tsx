import type { Metadata } from "next";
import Script from "next/script";
import ForPublicSectorClient from "@/app/design-v2/for/public-sector/client";

export const metadata: Metadata = {
  title: "OneGoodArea for public sector + research — Sourced, dated, FOI-survivable UK area metrics",
  description:
    "Sourced, dated, methodology-stamped UK area metrics that survive FOI and procurement review. Provenance on every signal, country-scoped percentiles by design, methodology version pinning for the contract cycle, plan-replayable AI for audit. Built for council planning, central-gov analytical units, regeneration bodies, and research institutes.",
  keywords: [
    "public sector area data UK",
    "council planning data API",
    "FOI-survivable area metrics",
    "regeneration data API",
    "deprivation API UK",
    "LSOA data UK",
    "research area scoring",
    "Homes England MHCLG data",
  ],
  openGraph: {
    title: "OneGoodArea for public sector + research — Sourced, dated, FOI-survivable UK area metrics",
    description:
      "Sourced, dated, methodology-stamped UK area metrics that survive FOI and procurement review. Country-scoped percentiles by design.",
    type: "website",
    url: "https://www.onegoodarea.com/for/public-sector",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea for public sector + research",
    description:
      "Sourced, dated, methodology-stamped UK area metrics that survive FOI and procurement review.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/for/public-sector" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Will the numbers survive an FOI response?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes by construction. Each signal carries source, observed_period, confidence, and confidence_reason. The methodology version is stamped on every response body and the X-Engine-Version header. The full methodology is public on /methodology. Your FOI footnote can point at source, release, and engine version.",
      },
    },
    {
      "@type": "Question",
      name: "Can we pin the methodology for a contract or procurement deliverable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PUT /v1/orgs/:id/methodology persists an engine_version pin per organisation. Owner-only, validated against the supported version window. Two API calls under the same pin return the same numbers across deploys.",
      },
    },
    {
      "@type": "Question",
      name: "Do you cover Northern Ireland?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not yet. England, Wales, and Scotland are covered today via the ONS NSPL spine and the three national deprivation methodologies (IMD 2025, WIMD 2019, SIMD 2020). NIMDM and the NI postcode spine are on the roadmap. NI postcodes return null rather than a fabricated cross-border value.",
      },
    },
    {
      "@type": "Question",
      name: "Can the analyst cite OneGoodArea in a research note or report?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Each signal carries a source string you can cite directly (police.uk, IMD 2025, HM Land Registry). For methodology citation, the canonical reference is the /methodology page plus the engine version (visible on the X-Engine-Version header).",
      },
    },
    {
      "@type": "Question",
      name: "What about precision and statistical confidence intervals?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Confidence today is availability + sample based (0 to 1), not a calibrated statistical CI. Property dimensions cap at MEDIUM when the YoY swing is wide. Calibrated outcome-based confidence is on the roadmap as Phase 7.",
      },
    },
    {
      "@type": "Question",
      name: "Can we aggregate signals to ward or district level?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Today aggregation is country and Local Authority District via the ONS spine. Ward-level and MSOA-level aggregation are on the roadmap. For now, resolve a list of LSOA codes and aggregate client-side, or persist as a Levers peer cohort.",
      },
    },
    {
      "@type": "Question",
      name: "What gets stored about us as an org?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Org row with name and slug; member roster with three-tier RBAC; api_keys linked to your org. Optional Levers state: signal bundles, saved scoring profiles, methodology pin, peer cohorts, white-label, per-key IP CIDR allowlist. No PII about residents of the areas you query; LSOA grain is statistical, not personal.",
      },
    },
  ],
};

export default function ForPublicSectorPage() {
  return (
    <>
      <Script
        id="ld-faq-public-sector"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ForPublicSectorClient />
    </>
  );
}
