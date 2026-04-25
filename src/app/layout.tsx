import type { Metadata } from "next";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/toast";
import { PageviewTracker } from "@/components/pageview-tracker";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/* Fonts are loaded via @import in globals.css from Google Fonts —
   identical setup to the live site so Fraunces / Inter / Geist Mono
   render exactly as Pedro likes. globals.css is shipped in the
   static <link rel="stylesheet"> in <head>, so the @import is
   parsed before paint (much smaller FOUC than the previous
   styled-jsx @import). next/font was tried but the variable font
   axis defaults rendered Fraunces noticeably differently from the
   live Google Fonts CSS endpoint. */

export const metadata: Metadata = {
  metadataBase: new URL("https://www.area-iq.co.uk"),
  title: "OneGoodArea | Know any UK area.",
  description:
    "UK area intelligence. Enter any postcode, pick your intent, get a scored report in seconds.",
  openGraph: {
    title: "OneGoodArea | Know any UK area.",
    description: "UK area intelligence. Scored reports for moving, business, investing, and research.",
    siteName: "OneGoodArea",
    type: "website",
    url: "https://www.area-iq.co.uk",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneGoodArea | Know any UK area.",
    description: "UK area intelligence. Scored reports for moving, business, investing, and research.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Google Fonts — Fraunces (display) + Inter (sans) + Geist Mono.
              preconnect so the woff2 fetches start as early as possible.
              Same URL as the live site so rendering matches exactly. */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("aiq-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`,
            }}
          />
          <meta name="msvalidate.01" content="PENDING" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: "OneGoodArea",
                url: "https://www.area-iq.co.uk",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description: "UK area intelligence. Scored reports for moving, business, investing, and research.",
                offers: {
                  "@type": "AggregateOffer",
                  lowPrice: "0",
                  highPrice: "249",
                  priceCurrency: "GBP",
                  offerCount: 4,
                },
              }),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "OneGoodArea",
                url: "https://www.area-iq.co.uk",
                logo: "https://www.area-iq.co.uk/favicon.ico",
                description: "UK area intelligence platform. Scored reports for moving, business, investing, and research.",
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "customer service",
                  url: "https://www.area-iq.co.uk/help",
                },
              }),
            }}
          />
        </head>
        <body className="antialiased">
          <ToastProvider>
            {children}
          </ToastProvider>
          <PageviewTracker />
          <Analytics />
        </body>
      </html>
    </SessionProvider>
  );
}
