import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl } from "@/lib/server/api-client";

/* POST /api/playground/proxy
   Thin BFF over apps/api's /playground/proxy. Forwards the incoming
   cookie so apps/api can decode the session, and mirrors the response
   headers the server-side handler sets (Set-Cookie on counter bump,
   Retry-After on 429).

   Anonymous. Rate limits + whitelist all enforced upstream. */

const HEADERS_TO_MIRROR = ["set-cookie", "retry-after"];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text().catch(() => "");
  const upstream = await fetch(`${apiBaseUrl()}/playground/proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: req.headers.get("cookie") ?? "",
      "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "",
      "X-Real-IP": req.headers.get("x-real-ip") ?? "",
    },
    body: body || "{}",
  });

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
  for (const name of HEADERS_TO_MIRROR) {
    const v = upstream.headers.get(name);
    if (v !== null) res.headers.set(name, v);
  }
  return res;
}
