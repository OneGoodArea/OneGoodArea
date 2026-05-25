import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlan, getMonthlyReportCount, hasMcpAccess, hasAddon, getMcpUsageThisMonth } from "@/lib/usage";
import { PLANS } from "@/lib/stripe";
import BillingClient from "@/app/design-v2/billing/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | OneGoodArea",
  description: "Manage your plan, MCP add-on, and subscription.",
};

/* AR-145 / AR-146 — in-app billing surface. Marketing /pricing routes here
   for any authenticated upgrade. The optional ?plan=<id> query param
   pre-selects a plan and the client shows a confirm-and-go panel before
   firing Stripe Checkout (no auto-fire — protects users from surprise
   redirects after sign-up). */

export default async function BillingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/dashboard/billing");

  const [plan, used, mcpAccess, mcpAddonOwned, mcpUsage] = await Promise.all([
    getUserPlan(userId),
    getMonthlyReportCount(userId),
    hasMcpAccess(userId),
    hasAddon(userId, "mcp"),
    getMcpUsageThisMonth(userId),
  ]);

  const planConfig = PLANS[plan];
  const planIncludesMcp = planConfig?.mcpAccess === true;

  return (
    <BillingClient
      plan={plan}
      planName={planConfig.name}
      used={used}
      limit={planConfig.reportsPerMonth}
      mcp={{
        access: mcpAccess,
        addonOwned: mcpAddonOwned,
        includedFreeViaPlan: planIncludesMcp,
        callsThisMonth: mcpUsage,
      }}
    />
  );
}
