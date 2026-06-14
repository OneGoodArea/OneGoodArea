import { type NextRequest, NextResponse } from "next/server";
import { proxyPublic } from "@/lib/server/proxy";

// Pageview tracking — public, no auth. Forwards user-agent (device detection)
// and x-vercel-ip-country (geo) so the API container sees the same headers.
export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxyPublic(req, "/track", {
    forwardHeaders: ["user-agent", "x-vercel-ip-country"],
  });
}
