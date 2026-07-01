/* Playground endpoint whitelist.

   Only READ endpoints of the public API are proxyable through the
   playground. Explicit allowlist rather than blocklist so anything we
   ship later doesn't accidentally become an anonymous-access surface.

   Each entry describes:
     method + path pattern (regex)
     max body size
     whether it's an NL AI call (billed against the NL sub-cap)
     max response size we relay back (defence against very-large
     responses being weaponised) */

export interface PlaygroundEndpoint {
  method: "GET" | "POST";
  /** Regex the incoming path must match. Path only, no query string. */
  pattern: RegExp;
  /** Human-readable description for error messages + logs. */
  label: string;
  /** Whether this call counts against the NL sub-cap. */
  isNl: boolean;
  /** Max body size (bytes) accepted from the client. */
  maxBodyBytes: number;
  /** Max response size (bytes) we relay to the browser. */
  maxResponseBytes: number;
}

const KB = 1024;

export const PLAYGROUND_ENDPOINTS: PlaygroundEndpoint[] = [
  {
    method: "GET",
    pattern: /^\/v1\/area(\?.*)?$/,
    label: "GET /v1/area",
    isNl: false,
    maxBodyBytes: 0,
    maxResponseBytes: 128 * KB,
  },
  {
    method: "POST",
    pattern: /^\/v1\/score$/,
    label: "POST /v1/score",
    isNl: false,
    maxBodyBytes: 2 * KB,
    maxResponseBytes: 64 * KB,
  },
  {
    method: "POST",
    pattern: /^\/v1\/peers$/,
    label: "POST /v1/peers",
    isNl: false,
    maxBodyBytes: 2 * KB,
    maxResponseBytes: 128 * KB,
  },
  {
    method: "GET",
    pattern: /^\/v1\/areas(\?.*)?$/,
    label: "GET /v1/areas",
    isNl: false,
    maxBodyBytes: 0,
    maxResponseBytes: 256 * KB,
  },
  {
    method: "POST",
    pattern: /^\/v1\/insights$/,
    label: "POST /v1/insights",
    isNl: false,
    maxBodyBytes: 2 * KB,
    maxResponseBytes: 256 * KB,
  },
  {
    method: "POST",
    pattern: /^\/v1\/forecast$/,
    label: "POST /v1/forecast",
    isNl: false,
    maxBodyBytes: 2 * KB,
    maxResponseBytes: 64 * KB,
  },
  /* NL Query — the AI planner. Hard-capped separately via the NL
     per-cookie limit (see rate-limit.ts). Body cap keeps prompt-
     injection cost bombs bounded. */
  {
    method: "POST",
    pattern: /^\/v1\/query$/,
    label: "POST /v1/query (NL)",
    isNl: true,
    maxBodyBytes: 1 * KB,
    maxResponseBytes: 256 * KB,
  },
];

/** Resolve an incoming (method, path) against the allowlist. Returns the
    entry or null if not allowed. */
export function findPlaygroundEndpoint(method: string, path: string): PlaygroundEndpoint | null {
  const m = method.toUpperCase();
  for (const e of PLAYGROUND_ENDPOINTS) {
    if (e.method === m && e.pattern.test(path)) return e;
  }
  return null;
}
