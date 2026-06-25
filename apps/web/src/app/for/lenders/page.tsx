import type { Metadata } from "next";
import Script from "next/script";
import ForLendersClient from "@/app/design-v2/for/lenders/client";

export const metadata: Metadata = {
  title: "OneGoodArea for lenders — Versioned, pinnable area scoring for regulated underwriting",
  description:
    "Versioned, pinnable area scoring your model risk team can defend. Engine version stamped on every response; pinning at the org level locks the numbers across deploys. Sample-size gated portfolio drift detection; plan-replayable AI for analyst queries. Built for residential and commercial lenders.",
  keywords: [
    "lender area data API",
    "model risk area scoring",
    "UK location risk API",
    "underwriting area data",
    "mortgage portfolio monitoring",
    "engine version pinning",
    "auditable AI for lenders",
    "FCA PRA SS1/23 area data",
  ],
  openGraph: {
    title: "OneGoodArea for lenders — Versioned, pinnable area scoring",
    description:
      "Versioned, pinnable area scoring your model risk team can defend. Engine version stamped on every response; pinning at the org level locks the numbers across deploys.",
    type: "website",
    url: "https://www.onegoodarea.com/for/lenders",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea for lenders — Versioned, pinnable area scoring",
    description:
      "Engine version stamped on every response. Org-level methodology pinning. Plan-replayable AI for analyst queries.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/for/lenders" },
};

/* FAQPage schema mirrors the in-page FAQS array in
   design-v2/for/lenders/client.tsx for the Google rich result. */
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is the engine version pinnable at the org level?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PUT /v1/orgs/:id/methodology persists a per-org engine_version pin, owner-only, validated against the supported version window. Every product surface honours the pin by stamping it on the X-Engine-Version response header. Body engine_version still reports what actually ran.",
      },
    },
    {
      "@type": "Question",
      name: "How is the methodology versioned?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Semver. MAJOR is breaking (would invalidate prior scores), MINOR is additive, PATCH is formula tuning. Supported pin window today is 2.0.0, 2.0.1, 2.0.2; all three are score-equivalent. The registry is public on /methodology and stamped on every response.",
      },
    },
    {
      "@type": "Question",
      name: "Can we replay an AI-assisted query for audit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. POST /v1/query returns the executed plan and plan_source on every response. Paste the plan back as a {plan} body and the LLM is never touched again; the same deterministic executor produces the same rows. Model risk can store the plan JSON alongside the decision record.",
      },
    },
    {
      "@type": "Question",
      name: "What is the latency profile for bulk scoring?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Per-key rate limit is 30 requests per minute on /v1/score, not metered against the monthly API call quota. For overnight portfolio runs, concurrent scoring within the rate budget is the typical pattern. Monitor's portfolio enrich endpoint runs synchronously with concurrency 5 and a 50-area cap per call; larger books are scored across multiple calls.",
      },
    },
    {
      "@type": "Question",
      name: "How do you handle FCA and PRA SS1/23 model risk requirements?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We do not certify your model; that is your model risk team's responsibility. We provide the inputs to do it well: versioned methodology, engine_version on every response, a plan-replayable AI seam, sample-size gating in change detection, country-scoped percentiles, source attribution on every signal. The full methodology is public on /methodology.",
      },
    },
    {
      "@type": "Question",
      name: "Can the engine version be locked across multiple environments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The org-level pin is set once and honoured on every key inside the org. If prod and staging operate under different orgs, you can pin them to different versions, run back-tests on staging, then flip prod with a single owner-only PUT.",
      },
    },
    {
      "@type": "Question",
      name: "What gets stored about our portfolios?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Two tables: portfolios (id, name, owner) and portfolio_areas (postcode or LSOA, optional label). No PII, no borrower data, no loan amounts. Webhooks are HMAC-SHA256 signed, Stripe-style, delivered to your registered public HTTPS endpoint.",
      },
    },
  ],
};

export default function ForLendersPage() {
  return (
    <>
      <Script
        id="ld-faq-lenders"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ForLendersClient />
    </>
  );
}
