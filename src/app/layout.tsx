import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/toast";
import { PageviewTracker } from "@/components/pageview-tracker";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("aiq-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}})()`,
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
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
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
