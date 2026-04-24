import type { Metadata } from "next";
import ChangelogClient from "./client";

export const metadata: Metadata = {
  title: "Changelog | OneGoodArea (Design V2)",
  description: "Design V2 preview: new features, fixes, and improvements shipped to OneGoodArea.",
  robots: { index: false, follow: false },
};

export default function DesignV2ChangelogPage() {
  return <ChangelogClient />;
}
