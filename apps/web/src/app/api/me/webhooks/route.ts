import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* /api/me/webhooks — proxied to apps/api /me/webhooks (GET + POST).
   apps/api owns the validation, URL + event-type checks, secret
   generation, and the INSERT. POST body is forwarded through.
   AR-350 (epic AR-343): converted from the legacy direct-SQL BFF. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/me/webhooks");
}

export async function POST(req: NextRequest) {
  return proxySession(req, "/me/webhooks", { forwardBody: true });
}
