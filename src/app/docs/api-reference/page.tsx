import type { Metadata } from "next";
import ApiReferenceClient from "./client";

export const metadata: Metadata = {
  title: "API reference | OneGoodArea",
  description: "Interactive REST API documentation for OneGoodArea. Generated from our OpenAPI 3.0 spec. Postman / Insomnia / curl ready.",
  alternates: { canonical: "https://www.onegoodarea.com/docs/api-reference" },
  robots: { index: true, follow: true },
};

export default function ApiReferencePage() {
  return <ApiReferenceClient />;
}
