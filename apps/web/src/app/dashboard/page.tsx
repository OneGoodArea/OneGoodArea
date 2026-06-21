import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/server/api-client";
import DashboardHomeClient from "@/app/design-v2/dashboard/client";
import type { Metadata } from "next";

/* AR-254 [AR-217-B5] /dashboard Home replaces the legacy report-
   centric dashboard with the new API + MCP-shaped Home page.

   Data is now fetched from the API container via GET /dashboard
   (composite endpoint), removing all direct DB access from this
   server component. */

export const metadata: Metadata = {
  title: "Home | OneGoodArea",
  description:
    "Your API key, the most common call, MCP access, and usage at a glance.",
};

interface PrimaryApiKey {
  key_prefix: string | null;
  name: string;
  last_used_at: string | null;
}

interface LatestCall {
  preset: string;
  area: string;
  score: number;
  created_at: string;
}

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
  emailVerified: boolean;
  primaryKey: PrimaryApiKey | null;
  latestCall: LatestCall | null;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/get-started?callbackUrl=/dashboard");

  const { data } = await callApi<DashboardData>("/dashboard", { userId });

  return (
    <DashboardHomeClient
      email={session?.user?.email ?? ""}
      emailVerified={data?.emailVerified ?? false}
      primaryKey={data?.primaryKey ?? null}
      latestCall={data?.latestCall ?? null}
      plan={data?.plan ?? "sandbox"}
      planName={data?.planName ?? "Sandbox"}
      used={data?.used ?? 0}
      limit={data?.limit ?? 35}
      mcp={{
        access: data?.mcp?.access ?? false,
        addonOwned: data?.mcp?.addonOwned ?? false,
        includedFreeViaPlan: data?.mcp?.includedFreeViaPlan ?? false,
      }}
    />
  );
}
