import type { FastifyRequest } from "fastify";
import type { RequestSource } from "./request-context";

/* AR-375 / AR-759: classify a User-Agent into the opaque client_app label we
   persist on events and training tables. Pure function — no Fastify dependency,
   easy to test. client_app is an open-ended string (not an enum): priority order
   matters, first specific signal wins. Wrapping clients (Claude Code / Cursor /
   Claude Desktop) may appear ALONGSIDE the MCP server stamp in a chained UA, so
   we check both and report the wrapper when present. Unknown UAs fall through to
   "other". */
export function classifyClientApp(userAgent: string | null | undefined): {
  source: RequestSource;
  client_app: string;
} {
  const ua = (userAgent ?? "").toLowerCase();
  const isMcp = ua.includes("onegoodarea-mcp-server");
  const source: RequestSource = isMcp ? "mcp" : "api";

  let client_app: string = "other";
  if (ua.includes("onegoodarea-estate-agents")) client_app = "estate-agents";
  else if (ua.includes("onegoodarea-proptech")) client_app = "proptech";
  else if (ua.includes("claude-code")) client_app = "claude-code";
  else if (ua.includes("cursor")) client_app = "cursor";
  else if (ua.includes("claude-ai") || ua.includes("claude/")) client_app = "claude-desktop";

  return { source, client_app };
}

/** Coerce a Fastify header (string | string[] | undefined) to string | null. */
export function headerString(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Levers AR-200: resolve the request's client IP for IP-allowlist
    enforcement. Prefers the first segment of `x-forwarded-for`
    (Render/Vercel/most reverse proxies set this), falls back to
    Fastify's request.ip. Trimmed. */
export function clientIpOf(request: FastifyRequest): string | null {
  const xff = headerString(request.headers["x-forwarded-for"]);
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.ip ?? null;
}

