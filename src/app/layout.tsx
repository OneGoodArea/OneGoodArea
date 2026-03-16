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
  title: "AreaIQ | Know any area. Instantly.",
  description:
    "AI-powered area intelligence. Enter any location, get a scored, structured intelligence report in seconds.",
  openGraph: {
    title: "AreaIQ | Know any area. Instantly.",
    description: "AI-powered UK area intelligence. Scored reports for moving, business, and investing decisions.",
    siteName: "AreaIQ",
    type: "website",
    url: "https://www.area-iq.co.uk",
  },
  twitter: {
    card: "summary_large_image",
    title: "AreaIQ | Know any area. Instantly.",
    description: "AI-powered UK area intelligence. Scored reports for moving, business, and investing decisions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem("aiq-theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light")}}catch(e){}})()`,
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "AreaIQ",
                url: "https://www.area-iq.co.uk",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                description: "AI-powered UK area intelligence. Scored reports for moving, business, and investing decisions.",
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
