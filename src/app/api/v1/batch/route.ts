import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { hasApiAccess, canGenerateReport } from "@/lib/usage";
import { trackEvent } from "@/lib/activity";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS, BATCH_MAX_ITEMS } from "@/lib/config";
import {
  BatchItem,
  isBatchItemArray,
  isSuccess,
  processBatchItems,
} from "@/lib/batch";

/* AR-130: bulk scoring endpoint for portfolio-scale buyers.
   Lender portfolios are 10k-500k properties; one-at-a-time /api/v1/report calls
   are operationally impossible. This endpoint accepts up to BATCH_MAX_ITEMS items
   per HTTP call, processes them with bounded concurrency, and returns a per-item
   result array (success or error). Pre-checks total quota; fails fast if the
   batch would exceed the user's remaining monthly allowance. */

export async function POST(req: NextRequest) {
  try {
    // Auth via Bearer key — identical to /api/v1/report
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

    // Batch-specific rate limit: 5 batches/min per key (vs 30 reqs/min for single)
    const rl = await rateLimit(`api-batch:${apiKey}`, {
      max: RATE_LIMITS.apiBatch.max,
      windowSeconds: RATE_LIMITS.apiBatch.windowSeconds,
    });
    const headers = rateLimitHeaders(RATE_LIMITS.apiBatch.max, rl);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many batch requests. Rate limit: 5 batches per minute." },
        { status: 429, headers },
      );
    }

    // Plan gate
    const apiAllowed = await hasApiAccess(userId);
    if (!apiAllowed) {
      return NextResponse.json(
        { error: "API access not available on your current plan. Upgrade at /pricing." },
        { status: 403, headers },
      );
    }

    // Parse + validate request body
    const body = await req.json();
    if (typeof body !== "object" || body === null || !("items" in body)) {
      return NextResponse.json(
        { error: "Request body must be { items: [...] }" },
        { status: 400, headers },
      );
    }
    if (!isBatchItemArray((body as { items: unknown }).items)) {
      return NextResponse.json(
        { error: "Each item must be { area: string, intent: string }" },
        { status: 400, headers },
      );
    }
    const items = (body as { items: BatchItem[] }).items;
    if (items.length === 0) {
      return NextResponse.json(
        { error: "items array cannot be empty" },
        { status: 400, headers },
      );
    }
    if (items.length > BATCH_MAX_ITEMS) {
      return NextResponse.json(
        {
          error: `Batch size ${items.length} exceeds max ${BATCH_MAX_ITEMS}. Split into smaller batches.`,
        },
        { status: 400, headers },
      );
    }

    // Pre-check: enough quota for the whole batch? Fail fast if not — avoid
    // consuming partial quota.
    const usage = await canGenerateReport(userId);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "Monthly report limit reached",
          used: usage.used,
          limit: usage.limit,
          plan: usage.plan,
        },
        { status: 429, headers },
      );
    }
    const remaining = usage.limit === Infinity ? Infinity : usage.limit - usage.used;
    if (items.length > remaining) {
      return NextResponse.json(
        {
          error: `Batch requires ${items.length} reports but you have ${remaining} remaining this period`,
          used: usage.used,
          limit: usage.limit,
          plan: usage.plan,
          batch_size: items.length,
          remaining,
        },
        { status: 429, headers },
      );
    }

    // Process with bounded concurrency
    const results = await processBatchItems(items, userId);

    const succeeded = results.filter(isSuccess).length;
    const failed = results.length - succeeded;
    trackEvent("api.batch.processed", userId, {
      batch_size: items.length,
      succeeded,
      failed,
    });

    return NextResponse.json(
      {
        results,
        summary: { total: items.length, succeeded, failed },
      },
      { headers },
    );
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    logger.error("[api/v1/batch] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
