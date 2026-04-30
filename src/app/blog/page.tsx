import type { Metadata } from "next";
import BlogClient from "@/app/design-v2/blog/client";

export const metadata: Metadata = {
  title: "Blog | OneGoodArea",
  description: "Area intelligence insights, UK property data analysis, and guides for home buyers, investors, and agents. Powered by real government data.",
  openGraph: {
    title: "Blog | OneGoodArea",
    description: "Area intelligence insights, UK property data analysis, and guides.",
    type: "website",
    url: "https://www.onegoodarea.com/blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Blog | OneGoodArea", description: "Area intelligence insights, UK property data analysis, and guides." },
  alternates: { canonical: "https://www.onegoodarea.com/blog" },
};

export default function BlogPage() {
  return <BlogClient />;
}
