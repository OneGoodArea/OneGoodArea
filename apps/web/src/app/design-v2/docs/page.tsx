import type { Metadata } from "next";
import DocsClient from "./client";

export const metadata: Metadata = {
  title: "API Documentation | OneGoodArea (Design V2)",
  description: "Design V2 preview: REST API and widget documentation.",
  robots: { index: false, follow: false },
};

export default function DesignV2DocsPage() {
  return <DocsClient />;
}
