import type { Metadata } from "next";
import ProductMonitorClient from "@/app/design-v2/products/monitor/client";

export const metadata: Metadata = {
  title: "Monitor — Portfolios and signed change detection | OneGoodArea",
  description:
    "Save a book of UK areas. Detect material moves across the monthly time-series. Sample-size gated. Stripe-style HMAC-SHA256 signed webhooks deliver each material change.",
  openGraph: {
    title: "Monitor — Portfolios and signed change detection | OneGoodArea",
    description:
      "Save a book of UK areas. Detect material moves across the monthly time-series. Sample-size gated. Stripe-style HMAC-SHA256 signed webhooks deliver each material change.",
    type: "article",
    url: "https://www.onegoodarea.com/products/monitor",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monitor — Portfolios and signed change detection | OneGoodArea",
    description:
      "Save a book of UK areas. Detect material moves across the monthly time-series. Sample-size gated. Signed webhooks deliver each material change.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/products/monitor" },
};

export default function ProductMonitorPage() {
  return <ProductMonitorClient />;
}
