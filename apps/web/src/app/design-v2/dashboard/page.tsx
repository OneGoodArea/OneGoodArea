import type { Metadata } from "next";
import DashboardHomeClient from "./client";

/* /design-v2/dashboard design preview route.

   Renders the production DashboardHomeClient (AR-254) against mock
   data so reviewers can hit a stable URL and see the visual at
   any time without needing real fixtures. The actual /dashboard
   route in apps/web/src/app/dashboard/page.tsx wires the same
   client to real data.

   Updated AR-254: the prior preview wired the old reports-list
   client. That client was replaced wholesale by the new Home, so
   this preview now reflects the new shape. */

export const metadata: Metadata = {
  title: "Dashboard | OneGoodArea (Design preview)",
  robots: { index: false, follow: false },
};

export default function DesignV2DashboardPage() {
  /* AR-255 preview mock: latestCall pinned to a fixed ISO string so
     the strip exercises formatAgo without invoking Date.now in the
     render (which trips react-hooks/no-impure-in-render). The "ago"
     label will slowly drift further into the past as time passes,
     fine for a design preview that just needs to show the strip's
     visual treatment. */
  return (
    <DashboardHomeClient
      email="reviewer@example.com"
      emailVerified={false}
      primaryKey={{
        key_prefix: "oga_live_AbCdEf",
        name: "Default",
        last_used_at: null,
      }}
      latestCall={{
        preset: "research",
        area: "SW1A 1AA",
        score: 78,
        created_at: "2026-06-09T18:37:00Z",
      }}
      plan="sandbox"
      planName="Sandbox"
      used={12}
      limit={35}
      mcp={{
        access: true,
        addonOwned: true,
        includedFreeViaPlan: false,
      }}
    />
  );
}
