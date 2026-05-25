import { mintBridgeToken } from "./bridge";

/* Server-side BFF client for apps/api.

   Next server routes/actions call apps/api THROUGH this helper (the browser only
   ever talks to apps/web — the BFF-proxy model). It mints a per-request bridge
   token and forwards. Returns the status + parsed body so a proxy route can
   relay them verbatim. Server-only. */

/** Internal base URL of apps/api (server-to-server). The container/host injects
    INTERNAL_API_URL; defaults to the local dev port. */
export function apiBaseUrl(): string {
  return process.env.INTERNAL_API_URL ?? "http://localhost:4000";
}

export interface ApiResponse<T> {
  status: number;
  ok: boolean;
  data: T;
}

export interface ApiCallOptions {
  /** The logged-in user's id (from the NextAuth session). */
  userId: string;
  method?: string;
  body?: unknown;
  /** Extra headers to forward (e.g. Idempotency-Key, X-Engine-Version). */
  headers?: Record<string, string>;
}

/** Call apps/api as a logged-in user. Mints a bridge token, forwards the
    request, and returns the status + parsed JSON body (null for an empty body).
    Network/parse errors throw; HTTP error statuses are returned for the caller
    to relay. */
export async function callApi<T = unknown>(path: string, opts: ApiCallOptions): Promise<ApiResponse<T>> {
  const token = await mintBridgeToken(opts.userId);
  const hasBody = opts.body !== undefined;

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...opts.headers,
    },
    body: hasBody ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = (text ? JSON.parse(text) : null) as T;
  return { status: res.status, ok: res.ok, data };
}
