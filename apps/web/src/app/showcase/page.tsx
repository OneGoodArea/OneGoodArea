import type { Metadata } from "next";
import ShowcaseHubClient from "@/app/design-v2/showcase-hub/client";

export const metadata: Metadata = {
  title: "OneGoodArea showcase — area intelligence workflows for 6 buyer types",
  description:
    "See how OneGoodArea area intelligence works across estate agents, proptech, lenders, insurance, CRE and public sector. Live workflow for estate agents — coming soon for the rest.",
  openGraph: {
    title: "OneGoodArea showcase — area intelligence workflows",
    description:
      "Live demo for estate agents. Coming soon for proptech, lenders, insurance, CRE and public sector.",
    type: "website",
    url: "https://www.onegoodarea.com/showcase",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  alternates: { canonical: "https://www.onegoodarea.com/showcase" },
};

export default function ShowcaseHubPage() {
  return <ShowcaseHubClient />;
}
