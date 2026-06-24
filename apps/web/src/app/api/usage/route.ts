import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/usage — proxied to apps/api GET /usage.
   The API container handles session auth + canMakeApiCall internally. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/usage");
}
