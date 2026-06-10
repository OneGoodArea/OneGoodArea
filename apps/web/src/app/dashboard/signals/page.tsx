import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignalsCatalogueClient from "@/app/design-v2/dashboard-signals/client";

/* AR-259 /dashboard/signals. Replaces the AR-252 ComingSoonPage
   placeholder. Server component is thin: auth-gate then render the
   catalogue client. Catalogue data is static (SIGNAL_CATALOGUE in
   contracts), the client doesn't fetch anything. */

export const metadata: Metadata = {
  title: "Signals | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/signals");
  }
  return <SignalsCatalogueClient />;
}
