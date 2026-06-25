import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/me/portfolios — proxied to apps/api GET /me/portfolios.
   Paginated + searchable list of the caller's portfolios with inline
   areas for the page rows. Distinct from /v1/portfolios (api-key
   authed, no pagination) — apps/api owns the dashboard-shaped
   session-authed variant.
   AR-349 (epic AR-343): converted from the legacy direct-SQL BFF. */
export async function GET(req: NextRequest) {
  return proxySession(req, "/me/portfolios", { forwardQuery: true });
}
