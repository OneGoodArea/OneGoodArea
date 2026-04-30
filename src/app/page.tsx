import type { Metadata } from "next";
import DesignV2Client from "@/app/design-v2/client";

export const metadata: Metadata = {
  title: "OneGoodArea | The deterministic UK location intelligence layer",
  description: "Deterministic area scoring for lenders, insurers, and PropTech. Auditable methodology, one API, seven public sources, scores you can ship to a regulator.",
  openGraph: {
    title: "OneGoodArea | The deterministic UK location intelligence layer",
    description: "Deterministic area scoring for lenders, insurers, and PropTech. Auditable methodology. One API, seven public sources.",
    type: "website",
    url: "https://www.onegoodarea.com",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea | The deterministic UK location intelligence layer",
    description: "Deterministic UK area scoring. Auditable methodology, one API, seven public sources.",
  },
  alternates: { canonical: "https://www.onegoodarea.com" },
};

function WebSiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "OneGoodArea",
          url: "https://www.onegoodarea.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.onegoodarea.com/report?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      }}
    />
  );
}

export default function Home() {
  return (
    <>
      <WebSiteJsonLd />
      <DesignV2Client />
    </>
  );
}
