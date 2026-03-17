import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { hasApiAccess, canGenerateReport } from "@/lib/usage";
import { generateReport } from "@/lib/generate-report";
import { trackEvent } from "@/lib/activity";
import { Intent } from "@/lib/types";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateLocationInput, validateIntent } from "@/lib/validation";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    // Authenticate via API key
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

    // Rate limit by API key
    const rl = await rateLimit(`api:${apiKey}`, {
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

    // Verify API access (Developer, Business, or Growth plan)
    const apiAllowed = await hasApiAccess(userId);
    if (!apiAllowed) {
      return NextResponse.json(
        { error: "API access requires a Developer, Business, or Growth plan" },
        { status: 403, headers }
      );
    }

    // Check monthly report limit
    const usage = await canGenerateReport(userId);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "Monthly report limit reached",
          used: usage.used,
          limit: usage.limit,
          plan: usage.plan,
        },
        { status: 429, headers }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const { area, intent } = body;

    const locationCheck = validateLocationInput(area);
    if (!locationCheck.valid) {
      return NextResponse.json(
        { error: locationCheck.error },
        { status: 400, headers }
      );
    }

    const intentCheck = validateIntent(intent);
    if (!intentCheck.valid) {
      return NextResponse.json(
        { error: intentCheck.error },
        { status: 400, headers }
      );
    }

    const result = await generateReport(locationCheck.sanitized, intent as Intent, userId);
    trackEvent("api.report.generated", userId, { area, intent, reportId: result.id });

    return NextResponse.json(
      {
        id: result.id,
        report: result.report,
      },
      { headers }
    );
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    logger.error("[API v1] Report generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
