import { NextRequest, NextResponse } from "next/server";
import { requireTestingRouteAccess } from "@/lib/runtime/testing/guards";

const SESSION_COOKIE = "authjs.session-token";

export async function POST(req: NextRequest) {
  const forbidden = requireTestingRouteAccess(req);
  if (forbidden) {
    return forbidden;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
