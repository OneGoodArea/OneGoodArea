import type { Metadata } from "next";
import DocsClient from "@/app/design-v2/docs/client";

export const metadata: Metadata = {
  title: "API Documentation | OneGoodArea",
  description: "Integrate area intelligence into your applications with the OneGoodArea REST API. RESTful endpoints, bearer auth, JSON responses.",
  openGraph: {
    title: "API Documentation | OneGoodArea",
    description: "Integrate area intelligence into your applications with the OneGoodArea REST API.",
    type: "article",
    url: "https://www.area-iq.co.uk/docs",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "API Documentation | OneGoodArea", description: "Integrate area intelligence into your applications with the OneGoodArea REST API." },
  alternates: { canonical: "https://www.area-iq.co.uk/docs" },
};

export default function DocsPage() {
  return <DocsClient />;
}
