import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/server/api-client";
import BillingClient from "@/app/design-v2/billing/client";
import { type PlanId } from "@/lib/stripe";
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

interface McpStatus {
  access: boolean;
  addonOwned: boolean;
  includedFreeViaPlan: boolean;
  callsThisMonth: number;
}

interface DashboardData {
  plan: string;
  planName: string;
  used: number;
  limit: number;
  mcp: McpStatus;
}

export default async function BillingPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/dashboard/billing");

  const { data } = await callApi<DashboardData>("/dashboard", { userId });

  return (
    <BillingClient
      plan={data?.plan as PlanId ?? "sandbox"}
      planName={data?.planName ?? "Sandbox"}
      used={data?.used ?? 0}
      limit={data?.limit ?? 35}
      mcp={{
        access: data?.mcp?.access ?? false,
        addonOwned: data?.mcp?.addonOwned ?? false,
        includedFreeViaPlan: data?.mcp?.includedFreeViaPlan ?? false,
        callsThisMonth: data?.mcp?.callsThisMonth ?? 0,
      }}
    />
  );
}
