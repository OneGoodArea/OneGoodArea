import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* POST /api/me/webhooks/:id/rotate-secret — proxied to apps/api.
   Generates a new HMAC signing secret. Returns it ONCE for the
   dashboard's one-time-reveal panel; the old secret stops verifying
   signatures immediately. AR-350 (epic AR-343): converted from the
   legacy direct-SQL BFF. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxySession(req, `/me/webhooks/${id}/rotate-secret`, { method: "POST" });
}
