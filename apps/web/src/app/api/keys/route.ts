import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET  /api/keys     — proxied to apps/api GET  /keys (list API keys)
   POST /api/keys     — proxied to apps/api POST /keys (create API key)
   The API container handles session auth, hasApiAccess gate for POST,
   listApiKeys, and createApiKey. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/keys");
}

export async function POST(req: NextRequest) {
  return proxySession(req, "/keys", { forwardBody: true });
}
