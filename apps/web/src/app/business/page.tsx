import type { Metadata } from "next";
import BusinessClient from "@/app/design-v2/business/client";

export const metadata: Metadata = {
  title: "For B2B integrators — UK area data + intelligence layer | OneGoodArea",
  description:
    "Deterministic signals at LSOA grain, configurable composite scoring with a pinnable engine version, portfolio monitoring with sample-size-gated change alerts, and a typed query plane where AI emits the plan and the database produces the answer. Built for PropTech, insurance, lenders, CRE, and public sector workflows.",
  openGraph: {
    title: "For B2B integrators — UK area data + intelligence layer | OneGoodArea",
    description:
      "Deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly UK area time-series. Five buyer workflows underneath one API key.",
    type: "website",
    url: "https://www.onegoodarea.com/business",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "For B2B integrators — UK area data + intelligence layer | OneGoodArea",
    description:
      "Deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly UK area time-series.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/business" },
};

export default function Business() {
  return <BusinessClient />;
}
