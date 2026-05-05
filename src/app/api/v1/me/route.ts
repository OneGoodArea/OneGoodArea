import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { getUserPlan, hasApiAccess, hasMcpAccess, canGenerateReport, listAddons, getMcpUsageThisMonth } from "@/lib/usage";
import { PLANS } from "@/lib/stripe";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * GET /api/v1/me
 *
 * Returns the authenticated user's current plan + entitlements. Used by:
 *   - The MCP server (mcp/) at startup to check if the customer's plan has
 *     mcpAccess. If not, the server fails fast with a clear upgrade message.
 *   - Future: any other downstream consumer that needs to check entitlement
 *     without going through the report flow.
 *
 * Auth via Bearer API key (same pattern as /api/v1/report). Cached client-side
 * by the MCP server for the lifetime of the process.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing API key. Use: Authorization: Bearer aiq_..." },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7);
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }

    // Rate-limit /me at the same level as the API report endpoint — MCP servers
    // call this once at startup but a misbehaving client could spam it.
    const rl = await rateLimit(`api-me:${apiKey}`, {
      max: RATE_LIMITS.apiReport.max,
      windowSeconds: RATE_LIMITS.apiReport.windowSeconds,
    });
    const headers = rateLimitHeaders(RATE_LIMITS.apiReport.max, rl);

    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Rate limit: 30 requests per minute." },
        { status: 429, headers }
      );
    }

    const [plan, apiAllowed, mcpAllowed, usage, addons, mcpUsed] = await Promise.all([
      getUserPlan(userId),
      hasApiAccess(userId),
      hasMcpAccess(userId),
      canGenerateReport(userId),
      listAddons(userId),
      getMcpUsageThisMonth(userId),
    ]);

    const planConfig = PLANS[plan];

    return NextResponse.json(
      {
        plan,
        plan_name: planConfig?.name ?? plan,
        generation: planConfig?.generation ?? "v1",
        api_access: apiAllowed,
        mcp_access: mcpAllowed,
        reports_per_month: planConfig?.reportsPerMonth ?? 0,
        used_this_month: usage.used,
        limit_this_month: usage.limit === Infinity ? null : usage.limit,
        engine_version: "2.0.0",
        addons,
        mcp_calls_this_month: mcpUsed,
      },
      { status: 200, headers }
    );
  } catch (err) {
    logger.error("[api/v1/me] Failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
