import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { callApi } from "@/lib/server/api-client";
import AdminClient from "@/app/design-v2/admin/client";
import type {
  Analytics,
  TrafficData,
  AudienceStats,
  UsageStats,
  RevenueExtras,
  McpAdoption,
  TrainingCorpus,
} from "@/app/design-v2/admin/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Analytics | OneGoodArea",
};

/* AR-313 Phase 0: gate was DB-backed via users.is_superuser (AR-312).
   AR-654: replaced with userType check from JWT session — no BFF
   round-trip needed. Admin pages are gated on userType ∈ {admin, superuser}.

   Phase 1: fetch audience composite alongside the legacy analytics +
   traffic blobs. All three populate different tabs; one round-trip per
   data shape, server-rendered so the client doesn't refetch on load. */
export default async function AdminPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/admin");

  const userType = session?.user?.userType;
  const isAdmin = userType === "admin" || userType === "superuser";
  if (!isAdmin) redirect("/dashboard");

  const [
    analyticsRes,
    trafficRes,
    audienceRes,
    usageRes,
    revenueRes,
    mcpAdoptionRes,
    trainingCorpusRes,
  ] = await Promise.all([
    callApi("/admin/analytics", { userId }),
    callApi("/admin/traffic-analytics", { userId }),
    callApi("/admin/audience", { userId }),
    callApi("/admin/usage", { userId }),
    callApi("/admin/revenue", { userId }),
    callApi("/admin/mcp-adoption", { userId }),
    callApi("/admin/training-corpus", { userId }),
  ]);

  /* Only pass through bodies on success — apps/api error responses
     have a different shape ({error: ...}) and would crash the client
     when it indexes into expected fields. */
  return (
    <AdminClient
      analytics={analyticsRes.ok ? (analyticsRes.data as Analytics) : null}
      traffic={trafficRes.ok ? (trafficRes.data as TrafficData) : null}
      audience={audienceRes.ok ? (audienceRes.data as AudienceStats) : null}
      usage={usageRes.ok ? (usageRes.data as UsageStats) : null}
      revenue={revenueRes.ok ? (revenueRes.data as RevenueExtras) : null}
      mcpAdoption={mcpAdoptionRes.ok ? (mcpAdoptionRes.data as McpAdoption) : null}
      trainingCorpus={trainingCorpusRes.ok ? (trainingCorpusRes.data as TrainingCorpus) : null}
    />
  );
}
