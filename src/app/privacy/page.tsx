import type { Metadata } from "next";
import PrivacyClient from "@/app/design-v2/privacy/client";

export const metadata: Metadata = {
  title: "Privacy Policy | OneGoodArea",
  description: "Privacy Policy for OneGoodArea. Learn how we collect, use, and protect your personal data in compliance with GDPR and UK data protection law.",
  openGraph: {
    title: "Privacy Policy | OneGoodArea",
    description: "How OneGoodArea collects, uses, and protects your personal data. GDPR compliant.",
    type: "article",
    url: "https://www.area-iq.co.uk/privacy",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Privacy Policy | OneGoodArea" },
  alternates: { canonical: "https://www.area-iq.co.uk/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
