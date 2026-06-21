import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MembersClient from "@/app/design-v2/dashboard-members/client";

/* AR-273 /dashboard/org/members. Replaces the AR-252 ComingSoonPage
   placeholder. Server component is intentionally thin: auth-gate then
   render the members client. */

export const metadata: Metadata = {
  title: "Team members | OneGoodArea",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/get-started?callbackUrl=/dashboard/org/members");
  }
  return <MembersClient />;
}
