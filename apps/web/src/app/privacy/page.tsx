import type { Metadata } from "next";
import PrivacyClient from "@/app/design-v2/privacy/client";

export const metadata: Metadata = {
  title: "Privacy Policy — OneGoodArea",
  description:
    "How OneGoodArea collects, uses, and protects your personal data. UK GDPR and Data Protection Act 2018 compliant. Lists every third-party processor, retention windows, and your rights as a data subject.",
  openGraph: {
    title: "Privacy Policy — OneGoodArea",
    description:
      "How OneGoodArea collects, uses, and protects your personal data. UK GDPR compliant.",
    type: "article",
    url: "https://www.onegoodarea.com/privacy",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy — OneGoodArea",
  },
  alternates: { canonical: "https://www.onegoodarea.com/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
