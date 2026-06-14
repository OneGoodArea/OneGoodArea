import { type NextRequest } from "next/server";
import { proxyApiKey } from "@/lib/server/proxy";

/* DELETE /api/v1/webhooks/[id] — proxied to apps/api DELETE /v1/webhooks/:id
   The API container handles API key validation, rate limiting,
   plan access, and revokeWebhookSubscription. */

export async function DELETE(req: NextRequest) {
  return proxyApiKey(req);
}
