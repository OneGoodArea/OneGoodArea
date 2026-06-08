import type { Metadata } from "next";
import GetStartedClient from "@/app/design-v2/get-started/client";

/* AR-249 [AR-248-A] /get-started — canonical entry funnel.

   Single-page sign-up + sign-in, email-first branching. Replaces the
   need for separate /sign-in and /sign-up routes; the legacy routes
   stay live for backward compat until a separate cleanup ticket
   retires them. */

export const metadata: Metadata = {
  title: "Get started | OneGoodArea",
  description:
    "Sign in or create your free Sandbox account. 35 API calls a month for evaluation. No card to start.",
  alternates: { canonical: "https://www.onegoodarea.com/get-started" },
};

export default function GetStartedPage() {
  return <GetStartedClient />;
}
