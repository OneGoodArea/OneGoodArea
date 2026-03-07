import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
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
  title: "AreaIQ — Know any area. Instantly.",
  description:
    "AI-powered area intelligence. Enter any location, get a scored, structured intelligence report in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#e4e4e8",
          colorBackground: "#0f0f12",
          colorInputBackground: "#09090b",
          colorInputText: "#e4e4e8",
          colorText: "#e4e4e8",
          colorTextSecondary: "#8a8a96",
          borderRadius: "0px",
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif",
        },
        elements: {
          userButtonAvatarBox: "rounded-none",
          userButtonPopoverCard: "bg-[#0f0f12] border border-[#1c1c22] rounded-none shadow-none",
          userButtonPopoverActions: "border-[#1c1c22]",
          userButtonPopoverActionButton: "text-[#e4e4e8] hover:bg-[#16161a] rounded-none text-[12px]",
          userButtonPopoverActionButtonText: "text-[12px]",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
