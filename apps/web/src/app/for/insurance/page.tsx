import type { Metadata } from "next";
import Script from "next/script";
import ForInsuranceClient from "@/app/design-v2/for/insurance/client";

export const metadata: Metadata = {
  title: "OneGoodArea for insurance + InsureTech — UK area-risk API the actuary can audit",
  description:
    "Configurable composite scoring with per-dimension confidence the actuary owns. Continuous portfolio drift detection with sample-size gating and signed webhooks. Peer-relative anomaly screening over a materialised similarity graph. Built for specialist carriers, MGAs, and InsureTech rating engines.",
  keywords: [
    "InsureTech area risk API",
    "insurance area data",
    "UK location risk API",
    "actuarial area scoring",
    "portfolio monitoring insurance",
    "signed webhook risk alerts",
    "peer-relative anomaly",
    "MGA underwriting API",
  ],
  openGraph: {
    title: "OneGoodArea for insurance + InsureTech — UK area-risk API the actuary can audit",
    description:
      "Configurable composite scoring with per-dimension confidence. Continuous portfolio drift detection with signed webhooks. Peer-relative anomaly screening.",
    type: "website",
    url: "https://www.onegoodarea.com/for/insurance",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea for insurance + InsureTech",
    description:
      "Configurable composite scoring with per-dimension confidence. Continuous portfolio drift detection with signed webhooks.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/for/insurance" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can the actuary tune the weights without redeploying our codebase?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Save the weighting recipe as a per-org scoring profile via POST /v1/orgs/:id/presets and reference it as preset_id on every /v1/score call. The actuary updates the profile via the dashboard or a PATCH; new quotes pick it up immediately. Profiles are versioned with created_at and updated_at so model risk can track what changed when.",
      },
    },
    {
      "@type": "Question",
      name: "What is the latency profile for inline rating engines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Per-key rate limit is 30 requests per minute on /v1/score and /v1/area. Typical pattern for rating engines is to cache the AreaProfile or score per postcode for a refresh window (monthly is the natural cadence). Async batch is on the roadmap for higher-throughput back-tests.",
      },
    },
    {
      "@type": "Question",
      name: "How are webhook deliveries signed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stripe-style HMAC-SHA256 over the raw body, sent as X-OneGoodArea-Signature: t=<unix>,v1=<hex>. The signing secret is returned ONCE on subscription create and never recoverable.",
      },
    },
    {
      "@type": "Question",
      name: "Can we use a custom peer set instead of the global similarity graph?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, via Levers peer cohorts. POST /v1/orgs/:id/cohorts persists a named list of LSOA codes (your insured universe, or a regional underwriting band). Pass cohort_id on /v1/peers and the candidate set is constrained to the cohort.",
      },
    },
    {
      "@type": "Question",
      name: "What happens during the renewal cycle when the engine version changes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Pin the engine version per org via PUT /v1/orgs/:id/methodology (owner-only). Two quarterly back-tests at the same pin return the same numbers. When a new engine version ships, validate on a staging org pinned to the new version, then flip prod via a single owner-only PUT.",
      },
    },
    {
      "@type": "Question",
      name: "Do you support MGA or carrier-of-carriers setups with separate books?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Each org is multi-tenant capable: separate signal bundles, scoring profiles, methodology pins, peer cohorts, and webhooks. The Levers stack is designed for the MGA pattern where one entity holds multiple books with different actuarial methodologies.",
      },
    },
    {
      "@type": "Question",
      name: "What gets stored about our insured locations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Two tables: portfolios (id, name, owner) and portfolio_areas (postcode or LSOA, plus an optional opaque label you supply). No PII, no policy data, no premium amounts.",
      },
    },
  ],
};

export default function ForInsurancePage() {
  return (
    <>
      <Script
        id="ld-faq-insurance"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ForInsuranceClient />
    </>
  );
}
