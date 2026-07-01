import type { Metadata } from "next";
import PlaygroundClient from "@/app/design-v2/playground/client";

/* /playground - Public interactive surface. Pre-signup demo where
   anyone can run real /v1/* queries against live prod, with bounded
   rate limits + Turnstile bot mitigation. See plan/032. */

export const metadata: Metadata = {
  title: "Playground | OneGoodArea",
  description:
    "Try OneGoodArea end-to-end. Real signals, real scores, real intelligence queries against live prod, no signup required.",
  openGraph: {
    title: "Playground | OneGoodArea",
    description:
      "Interactive demo of the OneGoodArea API. Run real queries against live UK property, crime, deprivation and schools data.",
    type: "website",
    url: "https://www.onegoodarea.com/playground",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Playground | OneGoodArea",
    description: "Run real API queries. No signup required.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/playground" },
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
