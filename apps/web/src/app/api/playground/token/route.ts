import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl } from "@/lib/server/api-client";

/* POST /api/playground/token
   Thin BFF for the /playground demo cookie issue. Forwards to apps/api's
   /playground/token and passes the Set-Cookie header through so the
   browser stores the signed session cookie for future proxy calls.

   Anonymous. No session, no bridge token — this is what BOOTSTRAPS the
   session. */

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text().catch(() => "");
  const upstream = await fetch(`${apiBaseUrl()}/playground/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      /* Forward client IP hints Cloudflare Turnstile scoring uses. */
      "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
      "X-Real-IP": req.headers.get("x-real-ip") ?? "",
    },
    body: body || "{}",
  });

  const text = await upstream.text();
  const setCookie = upstream.headers.get("set-cookie");

  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
  if (setCookie) res.headers.set("Set-Cookie", setCookie);
  return res;
}
