import type { Metadata } from "next";
import AcceptInviteClient from "@/app/design-v2/accept-invite/client";

/* AR-272: /accept-invite landing for the org invitation email.

   Server component is intentionally thin — the work is on the client
   side (NextAuth session check + POST to the BFF + redirect). Signed-out
   visitors get sent through /sign-in with a callbackUrl back here, so
   they land on the dashboard after authenticating. */

export const metadata: Metadata = {
  title: "Accept invitation | OneGoodArea",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AcceptInviteClient />;
}
