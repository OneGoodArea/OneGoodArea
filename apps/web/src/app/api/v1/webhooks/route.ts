import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { hasApiAccess } from "@/lib/usage";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/config";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  validateEventTypes,
  validateWebhookUrl,
} from "@/lib/webhooks";

/* AR-129: POST /api/v1/webhooks (create) + GET /api/v1/webhooks (list). */

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Missing API key. Use: Authorization: Bearer aiq_..." }, { status: 401 }) };
  }
  const apiKey = authHeader.slice(7);
  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return { error: NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 }) };
  }
  return { apiKey, userId };
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticate(req);
    if ("error" in authResult) return authResult.error;
    const { apiKey, userId } = authResult;

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

    const body = await req.json();
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Request body must be { url, events: [...] }" },
        { status: 400, headers },
      );
    }
    const { url, events } = body as { url?: unknown; events?: unknown };

    const urlCheck = validateWebhookUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error }, { status: 400, headers });
    }

    const eventList = validateEventTypes(events);
    if (!eventList) {
      return NextResponse.json(
        {
          error:
            "events must be a non-empty array of supported types: 'report.created' or 'signal.changed'",
        },
        { status: 400, headers },
      );
    }

    const created = await createWebhookSubscription(userId, urlCheck.sanitized, eventList);
    return NextResponse.json(created, { status: 201, headers });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/v1/webhooks POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticate(req);
    if ("error" in authResult) return authResult.error;
    const { apiKey, userId } = authResult;

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

    const subscriptions = await listWebhookSubscriptions(userId);
    return NextResponse.json({ subscriptions }, { headers });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/v1/webhooks GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
