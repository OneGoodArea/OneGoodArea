import type { Metadata } from "next";
import BlogClient from "./client";

export const metadata: Metadata = {
  title: "Blog | OneGoodArea (Design V2)",
  description: "Design V2 preview: area intelligence insights, UK property data analysis, and guides.",
  robots: { index: false, follow: false },
};

export default function DesignV2BlogPage() {
  return <BlogClient />;
}
