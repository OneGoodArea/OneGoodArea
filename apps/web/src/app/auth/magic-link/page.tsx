import type { Metadata } from "next";
import MagicLinkClient from "@/app/design-v2/auth-magic-link/client";

/* AR-250 [AR-248-B] /auth/magic-link — magic-link sign-in landing page.

   Users land here by clicking the link in their magic-link email
   (URL shape: /auth/magic-link?token=mlt_...). The client component
   reads ?token, calls NextAuth signIn("magic-link", { token }), and
   redirects to /dashboard on success or shows an error state if the
   token is expired / used / invalid. */

export const metadata: Metadata = {
  title: "Signing in | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function MagicLinkPage() {
  return <MagicLinkClient />;
}
