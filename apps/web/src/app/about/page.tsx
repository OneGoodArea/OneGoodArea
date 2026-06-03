import type { Metadata } from "next";
import AboutClient from "@/app/design-v2/about/client";

export const metadata: Metadata = {
  title: "About OneGoodArea — The data and intelligence layer underneath UK property workflows",
  description:
    "Deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series. One API, one methodology, version-pinned per organisation. Six principles, applied in code and methodology-versioned in every response.",
  keywords: [
    "UK area intelligence layer",
    "deterministic area scoring",
    "plan-replayable AI",
    "methodology version pinning",
    "country-scoped percentiles",
    "ONS postcode spine API",
    "property data API UK",
    "audit-grade area metrics",
  ],
  openGraph: {
    title: "About OneGoodArea — The data and intelligence layer underneath UK property workflows",
    description:
      "Deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series. One API, one methodology.",
    type: "website",
    url: "https://www.onegoodarea.com/about",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About OneGoodArea",
    description:
      "The data and intelligence layer underneath UK property workflows. Deterministic, plan-replayable, methodology-stamped.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/about" },
};

export default function About() {
  return <AboutClient />;
}
