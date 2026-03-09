import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
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
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </SessionProvider>
  );
}
