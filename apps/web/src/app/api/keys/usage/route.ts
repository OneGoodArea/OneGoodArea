import { NextResponse, type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/keys/usage — proxied to apps/api GET /keys/usage.
   The API container handles session auth (bridge token), hasApiAccess gate,
   getUserPlan, and all dashboard queries.

   AR-289: forwardQuery passes ?org=<id> through. apps/api validates org
   membership and applies the filter. Without the param, behaviour is
   unchanged (lifetime user-wide totals). */

export async function GET(req: NextRequest) {
  return proxySession(req, "/keys/usage", { forwardQuery: true });
}
