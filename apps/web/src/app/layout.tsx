import type { Metadata } from "next";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/toast";
import { PageviewTracker } from "@/components/pageview-tracker";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "@/styles/brand/tokens.css";
import "@/styles/brand/components.css";
import "@/styles/brand/backgrounds.css";

/* Fonts are loaded via @import in globals.css from Google Fonts —
   identical setup to the live site so Fraunces / Inter / Geist Mono
   render exactly as Pedro likes. globals.css is shipped in the
   static <link rel="stylesheet"> in <head>, so the @import is
   parsed before paint (much smaller FOUC than the previous
   styled-jsx @import). next/font was tried but the variable font
   axis defaults rendered Fraunces noticeably differently from the
   live Google Fonts CSS endpoint. */

export const metadata: Metadata = {
  metadataBase: new URL("https://www.onegoodarea.com"),
  title: "OneGoodArea | Know any UK area.",
  description:
    "UK area intelligence. Enter any postcode, pick your intent, get a scored report in seconds.",
  openGraph: {
    title: "OneGoodArea | Know any UK area.",
    description: "UK area intelligence. Scored reports for moving, business, investing, and research.",
    siteName: "OneGoodArea",
    type: "website",
    url: "https://www.onegoodarea.com",
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
          {/* Google Fonts. Fraunces + Inter retire when AR-150 PR #2 ships
              the shared shell on Geist; loaded together for now so no live
              route hits a missing-font flash during the brand transition. */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("aiq-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);if(t==="dark"){var b=function(){document.body&&document.body.setAttribute("data-oga-surface","dark")};if(document.body){b()}else{document.addEventListener("DOMContentLoaded",b,{once:true})}}}}catch(e){}})()`,
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
                url: "https://www.onegoodarea.com",
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
                url: "https://www.onegoodarea.com",
                logo: "https://www.onegoodarea.com/favicon.ico",
                description: "UK area intelligence platform. Scored reports for moving, business, investing, and research.",
                contactPoint: {
                  "@type": "ContactPoint",
                  contactType: "customer service",
                  url: "https://www.onegoodarea.com/help",
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
