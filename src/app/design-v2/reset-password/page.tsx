import type { Metadata } from "next";
import ResetPasswordClient from "./client";

export const metadata: Metadata = {
  title: "Choose a new password | OneGoodArea (Design V2)",
  robots: { index: false, follow: false },
};

export default function DesignV2ResetPasswordPage() {
  return <ResetPasswordClient />;
}
