import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { callApi } from "./api-client";

/* BFF proxy helper. The cutover "flip" turns each DB-touching Next /api route
   into a one-liner that forwards to apps/api through this:

     export const GET = (req) => proxySession(req, "/usage");

   The browser only ever talks to apps/web (its NextAuth cookie); this resolves
   the logged-in user, mints a bridge token (via callApi), forwards to the
   private apps/api, and relays the status + body verbatim. Server-only.

   NOTE: not wired into any route yet — flipping live routes is deploy-gated
   (they need a reachable apps/api). This is the tested mechanism the flip uses. */

export interface ProxyOptions {
  /** HTTP method to send to apps/api. Defaults to the incoming request's method. */
  method?: string;
  /** Forward the JSON request body (for POST/PUT/PATCH). */
  forwardBody?: boolean;
  /** Names of incoming headers to pass through (e.g. Idempotency-Key, X-Engine-Version). */
  forwardHeaders?: string[];
}

/** Proxy a session-authenticated Next route to apps/api. 401 (no apps/api call)
    if the caller is not logged in; otherwise relays apps/api's status + body. */
export async function proxySession(
  req: NextRequest,
  apiPath: string,
  opts: ProxyOptions = {},
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = opts.forwardBody ? await req.json().catch(() => undefined) : undefined;

  const headers: Record<string, string> = {};
  for (const name of opts.forwardHeaders ?? []) {
    const value = req.headers.get(name);
    if (value !== null) headers[name] = value;
  }

  const res = await callApi(apiPath, {
    userId,
    method: opts.method ?? req.method,
    body,
    headers,
  });

  return NextResponse.json(res.data, { status: res.status });
}
