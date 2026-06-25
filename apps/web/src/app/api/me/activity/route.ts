import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/me/activity — proxied to apps/api GET /me/activity.
   apps/api uses authenticateSession (same NextAuth cookie). The
   ?page= and ?page_size= query params are forwarded through.
   AR-344 (epic AR-343): converted from the legacy direct-SQL BFF
   that read activity_events. The pre-AR-289 comment about
   "bridge-token wiring isn't set up" no longer applies — proxySession
   handles bridge tokens. */
export async function GET(req: NextRequest) {
  return proxySession(req, "/me/activity", { forwardQuery: true });
}
