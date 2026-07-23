import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* POST /api/keys/playground — proxied to apps/api POST /keys/playground
   (AR-595, Plan 059.3). Auto-provisions an end-of-day API key for the
   signed-in caller's Scalar Try-It session if they don't already have an
   active key. Used by the /playground DeveloperSurface (AR-598, Plan
   059.6) to inject a working bearerAuth token for logged-in visitors
   without asking them to create one manually. 401 for anonymous callers —
   the playground handles that by leaving Scalar's auth panel unset. */

export async function POST(req: NextRequest) {
  return proxySession(req, "/keys/playground");
}
