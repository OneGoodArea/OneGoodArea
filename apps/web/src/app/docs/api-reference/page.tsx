import type { Metadata } from "next";
import Script from "next/script";
import ApiReferenceClient from "./client";

export const metadata: Metadata = {
  title: "API reference | OneGoodArea",
  description: "Interactive REST API documentation for OneGoodArea. Generated from our OpenAPI 3.0 spec. Postman / Insomnia / curl ready.",
  alternates: { canonical: "https://www.onegoodarea.com/docs/api-reference" },
  robots: { index: true, follow: true },
};

/* TechArticle schema (AR-780): marks the API reference as authoritative
   technical documentation for search and AI assistants. */
const techArticleLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "OneGoodArea API reference",
  description:
    "REST API documentation for OneGoodArea, generated from the OpenAPI 3.0 spec: endpoints, request and response shapes, and authentication.",
  url: "https://www.onegoodarea.com/docs/api-reference",
  author: { "@type": "Organization", name: "OneGoodArea", url: "https://www.onegoodarea.com" },
  publisher: { "@type": "Organization", name: "OneGoodArea", url: "https://www.onegoodarea.com" },
};

export default function ApiReferencePage() {
  return (
    <>
      <Script
        id="ld-techarticle-apiref"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleLd) }}
      />
      <ApiReferenceClient />
    </>
  );
}
