import type { Metadata } from "next";
import AboutClient from "./client";

export const metadata: Metadata = {
  title: "About | OneGoodArea (Design V2)",
  description: "Design V2 preview: the story and the principles behind OneGoodArea.",
  robots: { index: false, follow: false },
};

export default function DesignV2AboutPage() {
  return <AboutClient />;
}
