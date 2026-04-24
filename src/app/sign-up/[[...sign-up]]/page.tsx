import type { Metadata } from "next";
import SignUpClient from "@/app/design-v2/sign-up/client";

export const metadata: Metadata = {
  title: "Sign up | OneGoodArea",
  description: "Create a OneGoodArea account.",
  alternates: { canonical: "https://www.area-iq.co.uk/sign-up" },
};

export default function SignUpPage() {
  return <SignUpClient />;
}
