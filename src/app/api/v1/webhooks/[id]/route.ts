import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { hasApiAccess } from "@/lib/usage";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/config";
import { revokeWebhookSubscription } from "@/lib/webhooks";

/* AR-129: DELETE /api/v1/webhooks/[id] — revoke a subscription. */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing API key. Use: Authorization: Bearer aiq_..." },
        { status: 401 },
      );
    }
    const apiKey = authHeader.slice(7);
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
    }

    const rl = await rateLimit(`api:${apiKey}`, {
      max: RATE_LIMITS.apiReport.max,
      windowSeconds: RATE_LIMITS.apiReport.windowSeconds,
    });
    const headers = rateLimitHeaders(RATE_LIMITS.apiReport.max, rl);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Rate limit: 30 requests per minute." },
        { status: 429, headers },
      );
    }

    const apiAllowed = await hasApiAccess(userId);
    if (!apiAllowed) {
      return NextResponse.json(
        { error: "API access not available on your current plan. Upgrade at /pricing." },
        { status: 403, headers },
      );
    }

    const { id } = await params;
    const revoked = await revokeWebhookSubscription(userId, id);
    if (!revoked) {
      return NextResponse.json(
        { error: "Webhook subscription not found or already revoked" },
        { status: 404, headers },
      );
    }
    return NextResponse.json({ id, status: "revoked" }, { headers });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/v1/webhooks/[id] DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
