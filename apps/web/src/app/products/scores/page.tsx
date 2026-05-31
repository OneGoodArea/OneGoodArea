import type { Metadata } from "next";
import ProductScoresClient from "@/app/design-v2/products/scores/client";

export const metadata: Metadata = {
  title: "Scores — Deterministic composite scoring | OneGoodArea",
  description:
    "Deterministic 0-100 composite scoring for UK areas. Four purpose-built presets each with its own five-dimension set. Per-request custom weights or saved org presets. Engine version stamped on every response.",
  openGraph: {
    title: "Scores — Deterministic composite scoring | OneGoodArea",
    description:
      "Deterministic 0-100 composite scoring for UK areas. Four purpose-built presets each with its own five-dimension set. Per-request custom weights or saved org presets. Engine version stamped on every response.",
    type: "article",
    url: "https://www.onegoodarea.com/products/scores",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scores — Deterministic composite scoring | OneGoodArea",
    description:
      "Deterministic 0-100 composite scoring for UK areas. Four purpose-built presets each with its own five-dimension set.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/products/scores" },
};

export default function ProductScoresPage() {
  return <ProductScoresClient />;
}
