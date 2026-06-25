import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* /api/me/org — proxied to apps/api /me/org (GET + PATCH).
   apps/api owns the primary-org resolution + role gating now. The
   request body (PATCH) is forwarded through; the response shape is
   { org, caller_role } verbatim.
   AR-348 (epic AR-343): converted from the legacy direct-SQL BFF. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/me/org");
}

export async function PATCH(req: NextRequest) {
  return proxySession(req, "/me/org", { forwardBody: true });
}
