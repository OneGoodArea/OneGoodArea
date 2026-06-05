/* AR-217 Phase 0 — Dashboard primitives showcase (dev-only).

   Renders every Brand v3 dashboard primitive in all states so Pedro can
   eyeball them on localhost without spinning up a real consumer page.
   Each AR-217 Phase 0 sub-ticket appends its primitive to this page.

   Gated by NODE_ENV — only renders in development. On Vercel previews +
   production, returns 404. No auth required: the page does not surface
   user data, doesn't call the API, doesn't write anything. Pure visual
   verification of the design-system primitives.

   This is NOT a user-facing route; do NOT link to it from the sidebar or
   any marketing surface. */

import { notFound } from "next/navigation";
import DashboardPrimitivesClient from "@/app/design-v2/admin/dashboard-primitives/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard primitives | OneGoodArea (dev)",
  robots: { index: false, follow: false },
};

export default function DashboardPrimitivesPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DashboardPrimitivesClient />;
}
