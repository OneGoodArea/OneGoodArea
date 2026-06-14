import { type NextRequest } from "next/server";
import { proxyApiKey } from "@/lib/server/proxy";

/* GET /api/v1/me — proxied to apps/api GET /v1/me.
   The API container handles API key validation, rate limiting,
   and entitlement resolution. Web is a thin forwarder. */

export async function GET(req: NextRequest) {
  return proxyApiKey(req);
}
