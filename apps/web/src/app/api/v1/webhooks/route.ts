import { type NextRequest } from "next/server";
import { proxyApiKey } from "@/lib/server/proxy";

/* POST /api/v1/webhooks — proxied to apps/api POST /v1/webhooks
   GET  /api/v1/webhooks — proxied to apps/api GET  /v1/webhooks
   The API container handles API key validation, rate limiting,
   plan access, URL validation, and webhook CRUD. */

export async function POST(req: NextRequest) {
  return proxyApiKey(req);
}

export async function GET(req: NextRequest) {
  return proxyApiKey(req);
}
