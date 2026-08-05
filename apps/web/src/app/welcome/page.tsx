import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { callApi } from "@/lib/server/api-client";
import WelcomeClient from "@/app/design-v2/welcome/client";

/* AR-251 [AR-248-C] /welcome — minimal onboarding shell.

   Server component reads the session once and forwards just the
   email-derived workspace seed to the client. Avoids the useSession
   client-hook + SessionProvider plumbing that was tripping a
   ClientFetchError ("Unexpected token '<'") in dev. Server-side
   auth() is the canonical NextAuth v5 read path.

   AR-253: also reads users.email_verified so the client can show a
   verification reminder banner. The verify gate was dropped from
   onboarding (proposal section 2: verification REQUIRED to write data but
   NOT required to enter the dashboard) — the banner is the gentle
   nudge that replaces it.

   AR-646: email_verified now comes from the API (GET /auth/state) instead of
   a direct neon() call — web no longer touches the DB. */

export const metadata: Metadata = {
  title: "Welcome | OneGoodArea",
  description:
    "One short step before your dashboard. Name your workspace and you're in.",
  robots: { index: false, follow: false },
};

async function readAuthState(userId: string): Promise<{ emailVerified: boolean }> {
  const res = await callApi<{ emailVerified: boolean }>("/auth/state", { userId });
  if (!res.ok) return { emailVerified: false };
  return { emailVerified: res.data.emailVerified };
}

export default async function WelcomePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;
  const emailVerified = userId ? (await readAuthState(userId)).emailVerified : true;
  return (
    <WelcomeClient initialEmail={email} initialEmailVerified={emailVerified} />
  );
}
