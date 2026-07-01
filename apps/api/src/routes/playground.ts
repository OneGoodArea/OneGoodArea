import type { FastifyInstance } from "fastify";
import { clientIpOf } from "../shared/http";
import { logger } from "../modules/tracking/structured-logger";
import {
  decodeSession,
  encodeSession,
  newSession,
  readCookieFromHeader,
  setCookieHeader,
  PLAYGROUND_COOKIE_NAME,
} from "../modules/playground/session";
import { checkPlaygroundLimits } from "../modules/playground/rate-limit";
import { findPlaygroundEndpoint } from "../modules/playground/whitelist";
import { verifyTurnstile } from "../modules/playground/turnstile";

/* /playground/* — anonymous read-only proxy for the /playground page on
   apps/web. Never mounted under /v1 because it's a demo tunnel, not
   part of the public API. See plan/032. */
export function registerPlaygroundRoutes(app: FastifyInstance): void {
  /* POST /playground/token
     Issue (or refresh) a signed session cookie. Called by the client on
     first "Run" click. Optional Turnstile check when the operator has
     configured secrets; stub-passes otherwise. */
  app.post("/playground/token",
    {
      schema: {
        tags: ["Playground"],
        summary: "Issue a playground demo session cookie",
        description:
          "Anonymous. Verifies the Cloudflare Turnstile token when configured, then issues a 24h signed cookie holding per-session call counters.",
        body: {
          type: "object",
          properties: {
            turnstile_token: {
              type: "string",
              description: "cf-turnstile-response from the browser widget. Optional when Turnstile is not configured server-side.",
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { turnstile_token?: unknown };
      const token = typeof body.turnstile_token === "string" ? body.turnstile_token : null;
      const ip = clientIpOf(request);

      const t = await verifyTurnstile(token, ip);
      if (!t.ok) {
        return reply.code(503).send({ error: "Bot check temporarily unavailable, please retry." });
      }
      /* Turnstile is required-when-configured. In stub mode we
         intentionally issue a cookie with tv:false; that surfaces the
         unverified traffic in logs so we can see the coverage gap
         without breaking anyone. */
      if (!t.stub && !t.verified) {
        return reply.code(403).send({
          error: "Bot check failed. Refresh the page and try again.",
          code: "turnstile_failed",
          detail: t.errorCodes,
        });
      }

      const session = newSession({ turnstileVerified: t.verified });
      const cookieValue = encodeSession(session);
      reply.header("Set-Cookie", setCookieHeader(cookieValue));
      return reply.code(200).send({
        session_id: session.sid,
        expires_at: new Date(session.exp * 1000).toISOString(),
        turnstile_verified: session.tv,
        turnstile_stub: t.stub,
      });
    },
  );

  /* POST /playground/proxy
     Anonymous read-only forward to the real /v1/* handler. Body is:
       { method: "GET"|"POST", path: "/v1/area?postcode=M1+1AE", body?: {...} }
     - Cookie required; per-cookie counters enforced.
     - Endpoint whitelist enforced.
     - Multi-tier rate limits enforced.
     - PLAYGROUND_API_KEY injected as the Bearer key. */
  app.post("/playground/proxy",
    {
      schema: {
        tags: ["Playground"],
        summary: "Proxy a whitelisted /v1/* call under the demo session",
        body: {
          type: "object",
          required: ["method", "path"],
          properties: {
            method: { type: "string", enum: ["GET", "POST"] },
            path: { type: "string", description: "Path (with query string) of the /v1/* endpoint to call." },
            body: { type: "object", additionalProperties: true, description: "Optional JSON body for POST endpoints." },
          },
        },
      },
    },
    async (request, reply) => {
      const rawBody = (request.body ?? {}) as {
        method?: unknown;
        path?: unknown;
        body?: unknown;
      };
      const method = typeof rawBody.method === "string" ? rawBody.method : "";
      const path = typeof rawBody.path === "string" ? rawBody.path : "";

      /* 1. Cookie check. */
      const cookieValue = readCookieFromHeader(request.headers.cookie);
      const session = decodeSession(cookieValue);
      if (!session) {
        return reply.code(401).send({
          error: "No valid playground session. Call POST /playground/token first.",
          code: "no_session",
        });
      }

      /* 2. Whitelist check. */
      const endpoint = findPlaygroundEndpoint(method, path);
      if (!endpoint) {
        return reply.code(400).send({
          error: `Endpoint ${method} ${path} is not available in the playground. See /playground for the supported list.`,
          code: "endpoint_not_whitelisted",
        });
      }

      /* 3. Body-size check (before any rate limit deducts). */
      const bodyStr = rawBody.body !== undefined ? JSON.stringify(rawBody.body) : "";
      if (bodyStr.length > endpoint.maxBodyBytes) {
        return reply.code(413).send({
          error: `Request body exceeds playground limit for ${endpoint.label} (${endpoint.maxBodyBytes} bytes).`,
          code: "body_too_large",
        });
      }

      /* 4. Rate limits. */
      const ip = clientIpOf(request);
      const limits = await checkPlaygroundLimits({ session, ip, isNlCall: endpoint.isNl });
      if (!limits.ok) {
        const headers: Record<string, string> = {};
        if (limits.retry_after !== undefined) headers["Retry-After"] = String(limits.retry_after);
        return reply
          .code(429)
          .headers(headers)
          .send({
            error: limits.message ?? "Rate limit reached.",
            code: `rate_${limits.reason ?? "unknown"}`,
          });
      }

      /* 5. Forward. Use the internal API base (localhost during tests /
         same-container in prod), inject the demo key, preserve method +
         body verbatim. */
      const apiKey = process.env.PLAYGROUND_API_KEY;
      if (!apiKey) {
        logger.warn("[playground] PLAYGROUND_API_KEY not set; refusing proxy call");
        return reply.code(503).send({
          error: "Playground temporarily unavailable (backend not configured).",
          code: "playground_key_missing",
        });
      }

      const base = process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;
      const targetUrl = `${base}${path}`;
      const t0 = Date.now();
      let upstreamStatus = 0;
      let upstreamText = "";
      try {
        const upstream = await fetch(targetUrl, {
          method: endpoint.method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Playground-Session": session.sid,
          },
          body: endpoint.method === "GET" ? undefined : bodyStr || "{}",
          signal: AbortSignal.timeout(45_000),
        });
        upstreamStatus = upstream.status;
        upstreamText = await upstream.text();
      } catch (err) {
        logger.warn("[playground] upstream fetch threw", {
          endpoint: endpoint.label,
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(502).send({
          error: "Playground could not reach the API. Please retry.",
          code: "upstream_error",
        });
      }
      const latencyMs = Date.now() - t0;

      /* 6. Response size check. Truncate + flag if oversized rather
         than 502; users still see something. */
      let responseText = upstreamText;
      let truncated = false;
      if (Buffer.byteLength(upstreamText, "utf8") > endpoint.maxResponseBytes) {
        responseText = upstreamText.slice(0, endpoint.maxResponseBytes);
        truncated = true;
      }

      /* 7. Update counters. Increment total; NL calls also bump the NL
         counter. Only count successful upstream calls against the
         quota — a 4xx from the underlying API doesn't punish the user. */
      if (upstreamStatus >= 200 && upstreamStatus < 300) {
        session.tc += 1;
        if (endpoint.isNl) session.nc += 1;
        reply.header("Set-Cookie", setCookieHeader(encodeSession(session)));
      }

      /* 8. Relay. Wrap in a small envelope so the client can render the
         curl preview + latency chip in one payload. */
      let parsedResponse: unknown = null;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        parsedResponse = { raw: responseText };
      }
      return reply.code(200).send({
        endpoint: endpoint.label,
        upstream_status: upstreamStatus,
        latency_ms: latencyMs,
        truncated,
        response: parsedResponse,
        session: {
          calls_used: session.tc,
          calls_remaining: Math.max(0, (parseInt(process.env.PLAYGROUND_COOKIE_TOTAL ?? "30", 10) || 30) - session.tc),
          nl_calls_used: session.nc,
          nl_calls_remaining: Math.max(0, (parseInt(process.env.PLAYGROUND_COOKIE_NL ?? "3", 10) || 3) - session.nc),
        },
      });
    },
  );

  logger.info(`[playground] routes registered (cookie=${PLAYGROUND_COOKIE_NAME}, turnstile=${process.env.TURNSTILE_SECRET_KEY ? "on" : "stub"})`);
}
