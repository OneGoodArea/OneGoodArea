import type { Metadata } from "next";
import Script from "next/script";
import ForCreClient from "@/app/design-v2/for/cre/client";

export const metadata: Metadata = {
  title: "OneGoodArea for CRE + site selection — UK catchment-screening API",
  description:
    "Screen the whole UK against your compound site criteria in one typed call. Up to eight AND-joined signal filters with eleven comparison operators, country or LAD scope, peer-set discovery for your best-performing catchment, deterministic engine for reproducible shortlists. Built for retail expansion, CRE platforms, leasing analytics.",
  keywords: [
    "CRE site selection API",
    "retail expansion UK",
    "catchment screening API",
    "UK LSOA ranking",
    "compound query property",
    "store location data API",
    "site selection scoring",
    "commercial real estate analytics",
  ],
  openGraph: {
    title: "OneGoodArea for CRE + site selection — UK catchment-screening API",
    description:
      "Screen the whole UK against your compound site criteria in one typed call. Peer-set discovery and reproducible shortlists.",
    type: "website",
    url: "https://www.onegoodarea.com/for/cre",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea for CRE + site selection",
    description:
      "Screen the whole UK against your compound site criteria in one typed call. Peer-set discovery and reproducible shortlists.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/for/cre" },
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the difference between /v1/areas and /v1/query?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "/v1/areas is single-signal threshold-and-rank within a country or local authority. /v1/query is the compound version: up to 8 AND-joined signal filters, 11 comparison operators, plus the other five plan ops. Use /v1/areas for one-dimension screens; /v1/query for compound.",
      },
    },
    {
      "@type": "Question",
      name: "Can I screen hundreds of catchments at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. /v1/query with rank_areas caps at 1000 rows per call. Default limit 100. One INNER JOIN per filter signal; all parameters bound through prepared statements. Pipe result rows into /v1/area for full per-area profiles.",
      },
    },
    {
      "@type": "Question",
      name: "Can I customise the commercial dimensions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, within the business profile's fixed 5-dimension set (foot_traffic_demand, competition_density, transport_access, local_spending_power, commercial_costs). Custom weights per request or save a per-org profile via POST /v1/orgs/:id/presets and reference it as preset_id.",
      },
    },
    {
      "@type": "Question",
      name: "How do you handle catchments that are not LSOA-shaped?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Two options. (a) Approximate as a list of LSOA codes and persist via Levers peer cohorts (POST /v1/orgs/:id/cohorts), pass cohort_id on /v1/peers. (b) Resolve representative postcodes inside the catchment via /v1/area and aggregate client-side. Custom-polygon ingest is not on the roadmap.",
      },
    },
    {
      "@type": "Question",
      name: "Where does footfall data come from?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We surface the proxies (residential density, retail amenity counts within radii, transport-station counts) via the business scoring profile. We do not ingest mobile-device footfall feeds. OneGoodArea is the deterministic area-context layer underneath, not a footfall vendor.",
      },
    },
    {
      "@type": "Question",
      name: "How does the peer set get computed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Euclidean distance over normalised signal values, dimension-mean-squared. Symmetric, bounded in [0,1], robust to missing dimensions. Default k=20, min 3 overlapping dimensions. The graph is materialised in peer_assignments (~840k rows) by the refresh:peers batch.",
      },
    },
    {
      "@type": "Question",
      name: "Can the team replay the same shortlist next quarter?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Every /v1/query response echoes the executed plan and plan_source. Save the plan JSON; next quarter, paste it back as the request body and the same deterministic executor runs it against refreshed data. Org-level methodology pinning locks the engine version for byte-equivalent runs.",
      },
    },
  ],
};

export default function ForCrePage() {
  return (
    <>
      <Script
        id="ld-faq-cre"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ForCreClient />
    </>
  );
}
