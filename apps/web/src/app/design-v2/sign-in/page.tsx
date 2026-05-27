import type { Metadata } from "next";
import SignInClient from "./client";

export const metadata: Metadata = {
  title: "Sign in | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2SignInPage() {
  return <SignInClient />;
}
