import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canGenerateReport } from "@/lib/usage";
import { generateReport } from "@/lib/generate-report";
import { trackEvent } from "@/lib/activity";
import { sendReportEmail } from "@/lib/email";
import { Intent } from "@/lib/types";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateLocationInput, validateIntent } from "@/lib/validation";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60; // seconds

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit by user ID
    const rl = rateLimit(`report:${userId}`, {
      max: RATE_LIMIT_MAX,
      windowSeconds: RATE_LIMIT_WINDOW,
    });
    const headers = rateLimitHeaders(RATE_LIMIT_MAX, rl);

    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating another report." },
        { status: 429, headers }
      );
    }

    const usage = await canGenerateReport(userId);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "limit_reached", used: usage.used, limit: usage.limit, plan: usage.plan },
        { status: 403, headers }
      );
    }

    const { area, intent } = await req.json();

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
    trackEvent("report.generated", userId, { area, intent, reportId: result.id, score: result.report?.areaiq_score });

    // Send report email (fire-and-forget)
    const userEmail = session.user?.email;
    if (userEmail && result.report) {
      sendReportEmail(userEmail, result.id, result.report).catch((err) =>
        console.error("Failed to send report email:", err)
      );
    }

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
