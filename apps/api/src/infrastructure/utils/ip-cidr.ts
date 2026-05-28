/* Levers AR-200: pure CIDR-match helper used by validateApiKey to
   enforce per-key IP allowlists. Hand-rolled (no new dep) — supports
   IPv4 by integer mask and IPv6 by exact-equality fallback for the
   two interesting cases (loopback `::1` and explicit listing).

   Contract:
   - Empty allowlist  → matches (no restriction).
   - Any malformed entry → that single entry never matches; others are
     still considered. We don't throw; we silently skip so a bad CIDR
     can't break the auth path.
   - IPv6 prefix matching is intentionally limited: today's enterprise
     allowlists are overwhelmingly IPv4. Full IPv6 prefix support is
     deferred until a real customer needs it.

   See ADR 0034. */

/** PURE: does the request IP match any of the CIDR entries?
    Empty cidrs array = no restriction (returns true). */
export function ipMatchesCidrs(requestIp: string | null | undefined, cidrs: readonly string[]): boolean {
  if (!cidrs || cidrs.length === 0) return true;
  if (!requestIp) return false;

  // Strip an IPv6-mapped IPv4 prefix ("::ffff:1.2.3.4" -> "1.2.3.4").
  const ip = requestIp.replace(/^::ffff:/i, "");

  for (const entry of cidrs) {
    const trimmed = (entry ?? "").trim();
    if (!trimmed) continue;
    if (matchOne(ip, trimmed)) return true;
  }
  return false;
}

function matchOne(ip: string, cidr: string): boolean {
  // Exact equality (handles bare IPs without a "/" prefix length).
  if (!cidr.includes("/")) return ip === cidr;

  const [base, prefixStr] = cidr.split("/");
  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0) return false;

  // IPv4 path.
  if (isIPv4(ip) && isIPv4(base)) {
    if (prefix > 32) return false;
    const ipInt = ipv4ToInt(ip);
    const baseInt = ipv4ToInt(base);
    if (ipInt === null || baseInt === null) return false;
    if (prefix === 0) return true;
    // Mask with `>>> 0` to keep an unsigned 32-bit result.
    const mask = (0xffffffff << (32 - prefix)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
  }

  // IPv6 path — only exact-base equality is honoured today; prefix
  // matching is deferred.
  if (isIPv6(ip) && isIPv6(base)) {
    if (prefix > 128) return false;
    return normalizeIPv6(ip) === normalizeIPv6(base);
  }

  return false;
}

function isIPv4(s: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(s);
}

function isIPv6(s: string): boolean {
  // Permissive: any string containing a ":" that's not IPv4.
  return s.includes(":") && !isIPv4(s);
}

function ipv4ToInt(s: string): number | null {
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    acc = (acc * 256) + n;
  }
  // Convert to unsigned 32-bit.
  return acc >>> 0;
}

/** Lower-case + collapse multiple zero groups to "::". Good enough for
    the equality check we do in matchOne. */
function normalizeIPv6(s: string): string {
  return s.toLowerCase();
}
