import type { Metadata } from "next";
import ContactClient from "@/app/design-v2/contact/client";

export const metadata: Metadata = {
  title: "Contact OneGoodArea",
  description:
    "Talk to the team behind the data and intelligence layer for UK property workflows. Procurement, methodology, API access, or building on top of us. We read every message.",
  keywords: [
    "contact OneGoodArea",
    "UK property data API contact",
    "area intelligence sales",
    "OneGoodArea enterprise",
    "procurement OneGoodArea",
  ],
  openGraph: {
    title: "Contact OneGoodArea",
    description:
      "Talk to the team behind the data and intelligence layer for UK property workflows.",
    type: "website",
    url: "https://www.onegoodarea.com/contact",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact OneGoodArea",
    description:
      "Talk to the team behind the data and intelligence layer for UK property workflows.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/contact" },
};

export default function ContactPage() {
  return <ContactClient />;
}
