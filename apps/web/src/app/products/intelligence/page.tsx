import type { Metadata } from "next";
import ProductIntelligenceClient from "@/app/design-v2/products/intelligence/client";

export const metadata: Metadata = {
  title: "Intelligence — Typed query plane for UK area data | OneGoodArea",
  description:
    "A typed query plane over UK area data. Six plan ops, dual mode (programmatic JSON plan or natural-language question), Zod-strict grammar, deterministic SQL executor. AI emits the plan; the database produces the answer. 92.9% planner accuracy on a 14-case curated corpus.",
  openGraph: {
    title: "Intelligence — Typed query plane for UK area data | OneGoodArea",
    description:
      "A typed query plane over UK area data. Six plan ops, dual mode (programmatic JSON plan or natural-language question), Zod-strict grammar, deterministic SQL executor. AI emits the plan; the database produces the answer.",
    type: "article",
    url: "https://www.onegoodarea.com/products/intelligence",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intelligence — Typed query plane for UK area data | OneGoodArea",
    description:
      "A typed query plane over UK area data. Six plan ops, dual mode, Zod-strict grammar, deterministic SQL executor.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/products/intelligence" },
};

export default function ProductIntelligencePage() {
  return <ProductIntelligenceClient />;
}
