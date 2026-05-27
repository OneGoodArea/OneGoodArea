import type { Metadata } from "next";
import ForgotPasswordClient from "./client";

export const metadata: Metadata = {
  title: "Reset your password | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
