import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import SignInClient from "@/app/design-v2/sign-in/client";

export const metadata: Metadata = {
  title: "Sign in | OneGoodArea",
  description: "Sign in to your OneGoodArea account.",
  alternates: { canonical: "https://www.onegoodarea.com/sign-in" },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  /* AR-545: redirect already-authenticated users away from the auth page
     (server-side, no flash) so sign-in always starts from a clean state. */
  const session = await auth();
  if (session?.user?.id) {
    const { callbackUrl } = await searchParams;
    redirect(safeCallbackUrl(callbackUrl ?? null));
  }
  return <SignInClient />;
}
