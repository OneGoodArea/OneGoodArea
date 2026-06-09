import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import WelcomeClient from "@/app/design-v2/welcome/client";

/* AR-251 [AR-248-C] /welcome — minimal onboarding shell.

   Server component reads the session once and forwards just the
   email-derived workspace seed to the client. Avoids the useSession
   client-hook + SessionProvider plumbing that was tripping a
   ClientFetchError ("Unexpected token '<'") in dev. Server-side
   auth() is the canonical NextAuth v5 read path. */

export const metadata: Metadata = {
  title: "Welcome | OneGoodArea",
  description:
    "One short step before your dashboard. Name your workspace and you're in.",
  robots: { index: false, follow: false },
};

export default async function WelcomePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  return <WelcomeClient initialEmail={email} />;
}
