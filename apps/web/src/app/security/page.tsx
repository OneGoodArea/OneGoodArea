import type { Metadata } from "next";
import SecurityClient from "@/app/design-v2/security/client";

export const metadata: Metadata = {
  title: "Security | OneGoodArea",
  description:
    "How OneGoodArea protects your data: encryption, authentication, access control, sub-processors, data retention, and our compliance roadmap. UK GDPR and Data Protection Act 2018 aligned.",
  openGraph: {
    title: "Security | OneGoodArea",
    description:
      "The technical and organisational measures OneGoodArea has in place today, our sub-processors, and our compliance roadmap.",
    type: "article",
    url: "https://www.onegoodarea.com/security",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Security | OneGoodArea",
  },
  alternates: { canonical: "https://www.onegoodarea.com/security" },
};

export default function SecurityPage() {
  return <SecurityClient />;
}
