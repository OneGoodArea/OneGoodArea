import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* POST /api/report — proxied to apps/api POST /report.
   The API container handles the full pipeline: session auth, rate limiting,
   canGenerateReport gate, input validation, generateReport, trackEvent,
   and email delivery. No logic remains on the web side. */

export async function POST(req: NextRequest) {
  return proxySession(req, "/report", { forwardBody: true });
}
