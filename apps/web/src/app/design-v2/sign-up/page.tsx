import type { Metadata } from "next";
import SignUpClient from "./client";

export const metadata: Metadata = {
  title: "Create an account | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2SignUpPage() {
  return <SignUpClient />;
}
