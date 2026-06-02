import type { Metadata } from "next";
import BlogClient from "@/app/design-v2/blog/client";

export const metadata: Metadata = {
  title: "Blog — OneGoodArea",
  description:
    "Engineering notes, methodology deep-dives, and field-tested workflows from the team building the UK property intelligence layer. Updated as we ship.",
  keywords: [
    "OneGoodArea blog",
    "UK property data analysis",
    "area intelligence engineering",
    "methodology deep dive",
    "property API engineering notes",
    "UK area data API",
  ],
  openGraph: {
    title: "Blog — OneGoodArea",
    description:
      "Engineering notes, methodology deep-dives, and field-tested workflows from the team building the UK property intelligence layer.",
    type: "website",
    url: "https://www.onegoodarea.com/blog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — OneGoodArea",
    description:
      "Engineering notes, methodology deep-dives, and field-tested workflows.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/blog" },
};

export default function BlogPage() {
  return <BlogClient />;
}
