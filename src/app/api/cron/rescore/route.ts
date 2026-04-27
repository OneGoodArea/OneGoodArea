import { NextRequest, NextResponse } from "next/server";
import { runRescoreCron } from "../../../../../scripts/cron/rescore-top-postcodes";
import { logger } from "@/lib/logger";

/* Cron route: re-score top UK postcodes and append to report_history.
 *
 * Triggered monthly by Vercel Cron. Authorization required: Vercel Cron
 * sends `Authorization: Bearer ${CRON_SECRET}`, where CRON_SECRET is set
 * in Vercel dashboard → Settings → Environment Variables.
 *
 * Until CRON_SECRET is set and vercel.json schedule is configured, this
 * route is reachable for manual one-off invocations from a developer
 * (still requires CRON_SECRET in the local env to authenticate).
 *
 * Default behaviour: full run (all postcodes in TOP_POSTCODES). Override
 * with ?limit=N or ?dry_run=true query params.
 */

export const maxDuration = 300; // 5 minutes — fits ~60 postcodes serial, 100+ with parallelism

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured on this deployment" },
      { status: 503 }
    );
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const dryRun = url.searchParams.get("dry_run") === "true";
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  try {
    const summary = await runRescoreCron({ limit, dryRun });
    logger.info("[cron/rescore] done", summary);
    return NextResponse.json(summary);
  } catch (err) {
    logger.error("[cron/rescore] fatal", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    );
  }
}
