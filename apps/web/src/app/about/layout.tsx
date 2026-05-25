import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | OneGoodArea",
  description: "The story behind OneGoodArea. Transparent, intent-driven area intelligence for every UK location decision.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
