import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import GetStartedClient from "@/app/design-v2/get-started/client";

/* AR-249 [AR-248-A] /get-started — canonical entry funnel.

   Single-page sign-up + sign-in, email-first branching. Replaces the
   need for separate /sign-in and /sign-up routes; the legacy routes
   stay live for backward compat until a separate cleanup ticket
   retires them. */

export const metadata: Metadata = {
  title: "Get started | OneGoodArea",
  description:
    "Sign in or create your free Sandbox account. 200 API calls a month for evaluation. No card to start.",
  alternates: { canonical: "https://www.onegoodarea.com/get-started" },
};

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  /* AR-545: an already-authenticated user must never reach an auth page.
     Redirect server-side (no client flash) so sign-up always starts from a
     clean, logged-out state; a throttled/failed auto-sign-in then leaves the
     user logged out, never on a previous account. Mirrors the auth() guard in
     dashboard/page.tsx. */
  const session = await auth();
  if (session?.user?.id) {
    const { callbackUrl } = await searchParams;
    redirect(safeCallbackUrl(callbackUrl ?? null));
  }
  return <GetStartedClient />;
}
