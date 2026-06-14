import { type NextRequest } from "next/server";
import { proxyApiKey } from "@/lib/server/proxy";

/* POST /api/v1/batch — proxied to apps/api POST /v1/batch.
   The API container handles API key validation, batch rate limiting,
   plan access, quota pre-check, batch processing, idempotency,
   and engine version resolution. */

export async function POST(req: NextRequest) {
  return proxyApiKey(req);
}
