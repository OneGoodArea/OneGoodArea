import { NextResponse, type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/keys/usage — proxied to apps/api GET /keys/usage.
   The API container handles session auth (bridge token), hasApiAccess gate,
   getUserPlan, and all dashboard queries. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/keys/usage");
}
