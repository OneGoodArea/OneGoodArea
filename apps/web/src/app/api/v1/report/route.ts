import { type NextRequest } from "next/server";
import { proxyApiKey } from "@/lib/server/proxy";

/* POST /api/v1/report — proxied to apps/api POST /v1/report.
   The API container handles the full pipeline: API key validation,
   rate limiting, plan access, report generation, MCP gating,
   idempotency, and engine version resolution. */

export async function POST(req: NextRequest) {
  return proxyApiKey(req);
}
