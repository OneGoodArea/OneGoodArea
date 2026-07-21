import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import SignUpClient from "@/app/design-v2/sign-up/client";

export const metadata: Metadata = {
  title: "Sign up | OneGoodArea",
  description: "Create a OneGoodArea account.",
  alternates: { canonical: "https://www.onegoodarea.com/sign-up" },
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  /* AR-545: redirect already-authenticated users away from the auth page
     (server-side, no flash) so sign-up always starts from a clean state. */
  const session = await auth();
  if (session?.user?.id) {
    const { callbackUrl } = await searchParams;
    redirect(safeCallbackUrl(callbackUrl ?? null));
  }
  return <SignUpClient />;
}
