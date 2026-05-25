import type { Metadata } from "next";
import SignInClient from "@/app/design-v2/sign-in/client";

export const metadata: Metadata = {
  title: "Sign in | OneGoodArea",
  description: "Sign in to your OneGoodArea account.",
  alternates: { canonical: "https://www.onegoodarea.com/sign-in" },
};

export default function SignInPage() {
  return <SignInClient />;
}
