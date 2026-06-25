import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* /api/watchlist — proxied to apps/api /watchlist.
   apps/api uses authenticateSession (same NextAuth cookie pattern).
   GET returns the user's saved areas; POST adds one with the body
   forwarded through.
   AR-344 (epic AR-343): converted from the legacy direct-SQL BFF. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/watchlist");
}

export async function POST(req: NextRequest) {
  return proxySession(req, "/watchlist", { forwardBody: true });
}
