import type { FastifyRequest } from "fastify";

/** Detect MCP-originated requests via the User-Agent stamp set by the MCP api-client. */
export function isFromMcpServer(request: FastifyRequest): boolean {
  const ua = (request.headers["user-agent"] ?? "").toString().toLowerCase();
  return ua.includes("onegoodarea-mcp-server");
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

/** CORS headers for the public embeddable widget (callable from any site). */
export function widgetCorsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };
}
