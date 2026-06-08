import type { Metadata } from "next";
import GetStartedClient from "./client";

/* Design-v2 preview route — noindex. The canonical live URL is
   /get-started. Mirrors the legacy /design-v2/sign-in + /sign-up
   internal previews so designers can hit the surface directly. */

export const metadata: Metadata = {
  title: "Get started | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2GetStartedPage() {
  return <GetStartedClient />;
}
