import type { Metadata } from "next";
import VerifyClient from "./client";

export const metadata: Metadata = {
  title: "Verify email | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2VerifyPage() {
  return <VerifyClient />;
}
