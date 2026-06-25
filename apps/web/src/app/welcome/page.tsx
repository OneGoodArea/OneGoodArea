import type { Metadata } from "next";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/lib/auth";
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
   nudge that replaces it. One extra SELECT per /welcome render; the
   row is the same one auth() just touched, so it's hot in cache. */

export const metadata: Metadata = {
  title: "Welcome | OneGoodArea",
  description:
    "One short step before your dashboard. Name your workspace and you're in.",
  robots: { index: false, follow: false },
};

/* AR-342 (epic AR-340): direct SELECT against `users` is
   auth-flow-adjacent — same documented exception as lib/auth.ts (see
   feedback_no_db_in_web). The /welcome flow needs to read the
   verification status before NextAuth's session gets revalidated. */
async function readEmailVerified(userId: string): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return true;
  const sql = neon(url);
  const rows = (await sql`
    SELECT email_verified FROM users WHERE id = ${userId} LIMIT 1
  `) as Array<{ email_verified: boolean }>;
  return rows[0]?.email_verified ?? false;
}

export default async function WelcomePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const userId = session?.user?.id ?? null;
  const emailVerified = userId ? await readEmailVerified(userId) : true;
  return (
    <WelcomeClient initialEmail={email} initialEmailVerified={emailVerified} />
  );
}
