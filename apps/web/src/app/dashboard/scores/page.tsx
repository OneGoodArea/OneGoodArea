import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScoresWorkbenchClient from "@/app/design-v2/dashboard-scores/client";

/* AR-260 /dashboard/scores. Replaces the AR-252 ComingSoonPage
   placeholder. Server component is thin: auth-gate then render the
   workbench client. MVP runs on prebaked fixtures (4 postcodes x
   4 presets); live /v1/score integration is a follow-up. */

export const metadata: Metadata = {
  title: "Scores | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/scores");
  }
  return <ScoresWorkbenchClient />;
}
