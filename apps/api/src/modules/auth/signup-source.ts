/* signup_source attribution normalization.

   Mirrors apps/web/src/lib/signup-source.ts — the API needs this for the
   register endpoint to accept and normalize the signup_source field the
   web container forwards via proxyPublic.

   Allowed: lowercase ASCII letters, digits, dash, underscore, forward
   slash, dot. Anything else → "direct". Length capped at 64 chars. */

export const SIGNUP_SOURCE_DEFAULT = "direct";
const SIGNUP_SOURCE_MAX_LEN = 64;
const ALLOWED = /^[a-z0-9._/-]+$/;

export function normalizeSignupSource(raw: string | null | undefined): string {
  if (!raw) return SIGNUP_SOURCE_DEFAULT;
  const trimmed = raw.trim().toLowerCase().slice(0, SIGNUP_SOURCE_MAX_LEN);
  if (trimmed.length === 0) return SIGNUP_SOURCE_DEFAULT;
  if (!ALLOWED.test(trimmed)) return SIGNUP_SOURCE_DEFAULT;
  return trimmed;
}
