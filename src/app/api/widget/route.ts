import { NextRequest, NextResponse } from "next/server";
import { getCachedReport } from "@/lib/report-cache";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateLocationInput, validateIntent } from "@/lib/validation";
import { logger } from "@/lib/logger";

const WIDGET_RATE_LIMIT = 60; // requests per window
const WIDGET_WINDOW = 3600; // 1 hour

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const { searchParams } = req.nextUrl;
    const postcode = searchParams.get("postcode");
    const intent = searchParams.get("intent") || "moving";

    if (!postcode) {
      return NextResponse.json(
        { error: "Missing postcode parameter" },
        { status: 400, headers }
      );
    }

    // Validate inputs
    const locationCheck = validateLocationInput(postcode);
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

    // Rate limit by origin domain or IP
    const rateLimitKey = `widget:${origin || req.headers.get("x-forwarded-for") || "unknown"}`;
    const rl = await rateLimit(rateLimitKey, {
      max: WIDGET_RATE_LIMIT,
      windowSeconds: WIDGET_WINDOW,
    });

    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { ...headers, ...rateLimitHeaders(WIDGET_RATE_LIMIT, rl) } }
      );
    }

    // Try cache first (widgets should almost always hit cache)
    const cached = await getCachedReport(locationCheck.sanitized, intent);

    if (cached) {
      const report = cached.report;
      return NextResponse.json(
        {
          area: report.area,
          postcode: locationCheck.sanitized,
          intent: report.intent,
          score: report.areaiq_score,
          area_type: report.area_type || null,
          dimensions: report.sub_scores.map((s) => ({
            label: s.label,
            score: s.score,
          })),
          powered_by: "https://www.onegoodarea.com",
        },
        { headers }
      );
    }

    // Cache miss: widget only serves cached data to prevent unauthenticated AI spend
    return NextResponse.json(
      { error: "No cached data available for this location. Generate a report at https://www.onegoodarea.com first." },
      { status: 404, headers }
    );
  } catch (error) {
    logger.error("[widget] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch area data" },
      { status: 500, headers }
    );
  }
}
