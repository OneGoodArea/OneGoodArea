import type { NextRequest } from "next/server";
import { proxyPublic } from "@/lib/server/proxy";

/* Thin BFF proxy for the public contact form (AR-451). Forwards the
   POST body to apps/api POST /contact, which owns validation, spam
   defence, rate limiting, and email delivery. No DB, no logic here
   (no-db-in-web rule). x-forwarded-for is forwarded so the API can
   rate-limit on the real client IP rather than the Vercel edge IP. */
export function POST(req: NextRequest) {
  return proxyPublic(req, "/contact", { forwardHeaders: ["x-forwarded-for"] });
}
