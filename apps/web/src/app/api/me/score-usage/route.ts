import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/me/score-usage — proxied to apps/api GET /me/score-usage.
   Returns 30-day api.score.computed event counts grouped by preset.
   AR-347 (epic AR-343): converted from the legacy direct-SQL BFF that
   queried activity_events. apps/api owns the query now. */
export async function GET(req: NextRequest) {
  return proxySession(req, "/me/score-usage");
}
