import type { Metadata } from "next";
import DesignV2Client from "@/app/design-v2/client";

export const metadata: Metadata = {
  title: "OneGoodArea | UK Area Intelligence Reports",
  description: "Enter any UK postcode. Pick why you're looking. Get a scored intelligence report across safety, transport, schools, amenities, and cost.",
  openGraph: {
    title: "OneGoodArea | UK Area Intelligence Reports",
    description: "Enter any UK postcode. Pick why you're looking. Get a full read in seconds.",
    type: "website",
    url: "https://www.area-iq.co.uk",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea | UK Area Intelligence Reports",
    description: "Enter any UK postcode, get a scored intelligence report in seconds.",
  },
  alternates: { canonical: "https://www.area-iq.co.uk" },
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
          url: "https://www.area-iq.co.uk",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.area-iq.co.uk/report?q={search_term_string}",
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
