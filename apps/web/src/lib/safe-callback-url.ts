/* Shared helper to sanitize a ?callbackUrl= query param used for
   post-auth redirect. Originated as inline copies in /get-started,
   /sign-in, and /auth/magic-link (AR-249 + AR-250); extracted once
   the third call site landed.

   Rule: only allow same-origin RELATIVE paths.
   - Must start with a single "/"
   - Must NOT start with "//" — the URL parser would resolve that to
     a protocol-relative URL with the next path component as the host
     (`//evil.com/x` -> `https://evil.com/x`), which is the classic
     open-redirect vector

   Anything else falls back to `/dashboard`. */

export function safeCallbackUrl(raw: string | null): string {
  const FALLBACK = "/dashboard";
  if (!raw) return FALLBACK;
  if (!raw.startsWith("/")) return FALLBACK;
  if (raw.startsWith("//")) return FALLBACK;
  return raw;
}
