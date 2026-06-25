import { type NextRequest } from "next/server";
import { proxyPublic } from "@/lib/server/proxy";

/* GET /api/health — proxied to apps/api GET /health.
   Public health check (no auth). AR-344 (epic AR-343): converted from
   the legacy direct-SQL BFF (SELECT 1) to a thin proxy. */
export async function GET(req: NextRequest) {
  return proxyPublic(req, "/health");
}
