import type { FastifyRequest } from "fastify";
import type { ClientApp, RequestSource } from "./request-context";

/** Detect MCP-originated requests via the User-Agent stamp set by the MCP api-client. */
export function isFromMcpServer(request: FastifyRequest): boolean {
  const ua = (request.headers["user-agent"] ?? "").toString().toLowerCase();
  return ua.includes("onegoodarea-mcp-server");
}

/* AR-375: classify a User-Agent into the small enum we persist on events
   and training tables. Pure function — no Fastify dependency, easy to test.
   Priority order matters: first specific signal wins. Wrapping clients
   (Claude Code / Cursor / Claude Desktop) may appear ALONGSIDE the MCP
   server stamp in a chained UA, so we check both and report the wrapper
   when present. */
export function classifyClientApp(userAgent: string | null | undefined): {
  source: RequestSource;
  client_app: ClientApp;
} {
  const ua = (userAgent ?? "").toLowerCase();
  const isMcp = ua.includes("onegoodarea-mcp-server");
  const source: RequestSource = isMcp ? "mcp" : "api";

  let client_app: ClientApp = "other";
  if (ua.includes("claude-code")) client_app = "claude-code";
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

