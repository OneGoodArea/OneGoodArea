#!/usr/bin/env node
/**
 * Mint a short-lived bridge JWT for a user, for local API testing.
 *
 * The API authenticates browser-user (Session/Admin) calls via a stateless JWT
 * bridge signed with AUTH_SECRET (apps/api/src/modules/auth/session-token.ts) —
 * it does NOT issue next-auth cookies. This script mirrors that contract so test
 * scripts (setup-test-tokens.sh) can mint a token the running API will verify.
 *
 * Usage:
 *   DATABASE_URL=postgres://... NEON_FETCH_ENDPOINT=http://localhost:55433/sql \
 *   AUTH_SECRET=replace-me \
 *   node scripts/mint-session-token.mjs --email test@example.com
 *
 * Environment:
 *   DATABASE_URL       - required, local Postgres DSN (host-run scripts)
 *   NEON_FETCH_ENDPOINT- optional, routes @neondatabase/serverless to the proxy
 *   AUTH_SECRET        - defaults to "replace-me" (matches local compose.yml api)
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import { SignJWT } from "jose";
import { parseArgs } from "node:util";

const parsed = parseArgs({
  options: {
    email: { type: "string" },
    ttl: { type: "string", default: "1h" },
    help: { type: "boolean", short: "h" },
  },
});

if (parsed.values.help || !parsed.values.email) {
  console.log(
    "Usage: DATABASE_URL=... node scripts/mint-session-token.mjs --email <email> [--ttl 1h]",
  );
  process.exit(parsed.values.help ? 0 : 1);
}

const email = parsed.values.email.trim().toLowerCase();
const ttl = parsed.values.ttl;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
if (fetchEndpoint) {
  neonConfig.fetchEndpoint = fetchEndpoint;
}

const secret = process.env.AUTH_SECRET ?? "replace-me";
const key = new TextEncoder().encode(secret);

const sql = neon(url);
const rows = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
if (rows.length === 0) {
  console.error(`User ${email} not found`);
  process.exit(1);
}

const userId = rows[0].id;

const token = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(userId)
  .setIssuedAt()
  .setExpirationTime(ttl)
  .sign(key);

console.log(token);
