import type { Metadata } from "next";
import MethodologyClient from "@/app/design-v2/methodology/client";

export const metadata: Metadata = {
  title: "Scoring Methodology | OneGoodArea",
  description: "How OneGoodArea scores areas: transparent formulas applied to 7 live UK data sources. Same postcode, same score, every time.",
  openGraph: {
    title: "Scoring Methodology | OneGoodArea",
    description: "Transparent scoring applied to 7 live UK data sources. Same postcode, same score, every time.",
    type: "article",
    url: "https://www.area-iq.co.uk/methodology",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Scoring Methodology | OneGoodArea", description: "Transparent scoring applied to 7 live UK data sources." },
  alternates: { canonical: "https://www.area-iq.co.uk/methodology" },
};

export default function MethodologyPage() {
  return <MethodologyClient />;
}
