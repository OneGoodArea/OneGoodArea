import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | OneGoodArea",
  description: "Product updates, new features, and improvements to OneGoodArea. See what we ship, month by month.",
  openGraph: {
    title: "Changelog | OneGoodArea",
    description: "Product updates, new features, and improvements to OneGoodArea.",
    type: "article",
    url: "https://www.onegoodarea.com/changelog",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Changelog | OneGoodArea", description: "Product updates, new features, and improvements to OneGoodArea." },
  alternates: { canonical: "https://www.onegoodarea.com/changelog" },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
