/* AR-249 [AR-248-A] signup_source attribution.

   Per AR-248 proposal section 1: the visitor's ?source=... URL param on
   /get-started (or any landing surface) is captured to a cookie so it
   survives navigation through the journey, then written to
   users.signup_source at account creation. The column shipped in
   AR-218.

   Allowed values: lowercase ASCII letters, digits, dash, underscore,
   forward slash, dot — anything else falls back to "direct". Length
   capped at 64 chars to keep the cookie small and the column
   predictable. This is attribution data, not user input, so we keep
   it tight rather than tolerate junk. */

export const SIGNUP_SOURCE_COOKIE = "oga_signup_source";
export const SIGNUP_SOURCE_DEFAULT = "direct";
export const SIGNUP_SOURCE_MAX_AGE_DAYS = 30;
const SIGNUP_SOURCE_MAX_LEN = 64;
const ALLOWED = /^[a-z0-9._/-]+$/;

/** Returns a safe attribution string. Invalid / empty input -> "direct". */
export function normalizeSignupSource(raw: string | null | undefined): string {
  if (!raw) return SIGNUP_SOURCE_DEFAULT;
  const trimmed = raw.trim().toLowerCase().slice(0, SIGNUP_SOURCE_MAX_LEN);
  if (trimmed.length === 0) return SIGNUP_SOURCE_DEFAULT;
  if (!ALLOWED.test(trimmed)) return SIGNUP_SOURCE_DEFAULT;
  return trimmed;
}

/** Client-side cookie read for the existing signup source. */
export function readSignupSourceCookie(): string {
  if (typeof document === "undefined") return SIGNUP_SOURCE_DEFAULT;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    const [k, ...rest] = c.split("=");
    if (k === SIGNUP_SOURCE_COOKIE) {
      const v = rest.join("=");
      return normalizeSignupSource(decodeURIComponent(v));
    }
  }
  return SIGNUP_SOURCE_DEFAULT;
}

/** Client-side cookie write. Only writes if value is meaningful (not
    the default sentinel) so a normal /get-started visit without a
    ?source= param doesn't overwrite an earlier attributed cookie. */
export function writeSignupSourceCookie(value: string): void {
  if (typeof document === "undefined") return;
  const safe = normalizeSignupSource(value);
  if (safe === SIGNUP_SOURCE_DEFAULT) return;
  const maxAgeSec = SIGNUP_SOURCE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = [
    `${SIGNUP_SOURCE_COOKIE}=${encodeURIComponent(safe)}`,
    `Max-Age=${maxAgeSec}`,
    "Path=/",
    "SameSite=Lax",
    /* Secure only when served over HTTPS (production); localhost dev
       speaks http:// so omit Secure there to keep the cookie working. */
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "Secure"
      : "",
  ]
    .filter(Boolean)
    .join("; ");
}
