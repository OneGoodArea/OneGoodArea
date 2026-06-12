import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { callApi, apiBaseUrl } from "./api-client";

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

/** Proxy a public (no-auth) Next route to apps/api. Forwards the JSON
    body as-is — no bridge token, no API key. Use this for auth endpoints
    (register, login, forgot-password, etc.) that are open to unauthenticated
    callers.

    Set opts.forwardHeaders to pass through incoming headers the API needs
    (e.g. user-agent, x-vercel-ip-country for pageview tracking). */
export async function proxyPublic(
  req: NextRequest,
  apiPath: string,
  opts: { forwardHeaders?: string[] } = {},
): Promise<NextResponse> {
  const apiUrl = `${apiBaseUrl()}${apiPath}`;
  const body = req.method !== "GET" ? await req.json().catch(() => undefined) : undefined;

  const headers: Record<string, string> = body ? { "content-type": "application/json" } : {};
  for (const name of opts.forwardHeaders ?? []) {
    const value = req.headers.get(name);
    if (value !== null) headers[name] = value;
  }

  const res = await fetch(apiUrl, {
    method: req.method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
