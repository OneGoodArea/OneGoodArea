import type { Metadata } from "next";
import Script from "next/script";
import ForEstateAgentsClient from "@/app/design-v2/for/estate-agents/client";

export const metadata: Metadata = {
  title: "OneGoodArea for Estate Agents: UK area data for property listings and brochures",
  description:
    "Give every listing the area story buyers ask for. Schools, crime, prices and transport for any UK postcode, source-backed and country-scoped, from one API. No data team, no extra integrations — render it straight onto your brochures and portals.",
  keywords: [
    "estate agent API",
    "UK area data",
    "property brochure area data",
    "area intelligence for estate agents",
    "house listing area info",
    "what's it like to live here data",
    "local area data for property listings",
  ],
  openGraph: {
    title: "OneGoodArea for Estate Agents: UK area data API",
    description:
      "Turn area data into a reason to book a viewing. Schools, crime, prices and transport per UK postcode, with country-scoped percentiles and source attribution.",
    type: "website",
    url: "https://www.onegoodarea.com/for/estate-agents",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea for Estate Agents: UK area data API",
    description:
      "One API call returns the whole area story for any UK postcode. Built for brochures, portals, CRMs and valuation software.",
  },
  alternates: { canonical: "https://www.onegoodarea.com/for/estate-agents" },
};

/* FAQPage schema markup powers the FAQ-rich-result on Google. Mirrors
   the questions in /design-v2/for/estate-agents/client.tsx's FAQS array. */
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "We're agents, not a software team — is this hard to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "One authenticated GET at /v1/area returns the whole area story for a postcode as plain JSON. Your software or portal provider wires it once; from then on it renders onto any listing without extra integrations.",
      },
    },
    {
      "@type": "Question",
      name: "How fresh is the area data?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Neighbourhood level (LSOA), refreshed monthly, for any UK postcode across England, Wales and Scotland. The same postcode within a month returns the same data, so cache windows on busy listing pages can be generous.",
      },
    },
    {
      "@type": "Question",
      name: "Can we publish the scores on our own listings and brochures?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. It is your brochure and your design — render the score, the signals and the comparison however fits your brand. Each value carries its source so you can attribute the data if you want to, but the OneGoodArea brand is not required.",
      },
    },
    {
      "@type": "Question",
      name: "Does this actually help sell houses?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Buyers research an area before they book a viewing. The demo at /showcase/estate-agents returns live signals per postcode, so the area story becomes a reason to view rather than a question you answer by hand.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free way to try it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The free Developer tier gives you full access for 30 days, no card, to evaluate against. Pricing for production is at /pricing.",
      },
    },
  ],
};

export default function ForEstateAgentsPage() {
  return (
    <>
      <Script
        id="ld-faq-estate-agents"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <ForEstateAgentsClient />
    </>
  );
}
