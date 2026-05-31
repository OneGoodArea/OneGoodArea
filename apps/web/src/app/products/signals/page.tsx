import type { Metadata } from "next";
import ProductSignalsClient from "@/app/design-v2/products/signals/client";

export const metadata: Metadata = {
  title: "Signals — UK area data API | OneGoodArea",
  description:
    "Deterministic, addressable UK area data at LSOA grain. Typed Signal primitive with national-within-country percentiles, per-signal confidence and source provenance on every response.",
  openGraph: {
    title: "Signals — UK area data API | OneGoodArea",
    description:
      "Deterministic, addressable UK area data at LSOA grain. Typed Signal primitive with national-within-country percentiles, per-signal confidence and source provenance on every response.",
    type: "article",
    url: "https://www.onegoodarea.com/products/signals",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Signals — UK area data API | OneGoodArea",
    description:
      "Deterministic, addressable UK area data at LSOA grain. Typed Signal primitive with national-within-country percentiles, per-signal confidence and source provenance on every response.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/products/signals" },
};

export default function ProductSignalsPage() {
  return <ProductSignalsClient />;
}
