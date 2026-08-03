#!/usr/bin/env node
/**
 * Promote a user to superadmin by setting user_type in the DB.
 *
 * Usage:
 *   NEON_FETCH_ENDPOINT=http://localhost:55433/sql \
 *   DATABASE_URL=postgres://user:pass@host:port/db \
 *   node scripts/promote-superuser.mjs --email test@example.com
 */
import { neon, neonConfig } from "@neondatabase/serverless";
import { parseArgs } from "node:util";

const parsed = parseArgs({
  options: {
    email: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

if (parsed.values.help || !parsed.values.email) {
  console.log("Usage: node scripts/promote-superuser.mjs --email <email>");
  process.exit(parsed.values.help ? 0 : 1);
}

const email = parsed.values.email.trim().toLowerCase();
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
if (fetchEndpoint) {
  neonConfig.fetchEndpoint = fetchEndpoint;
}

const sql = neon(url);
const rows = await sql`UPDATE users SET user_type = 'superuser' WHERE email = ${email} RETURNING id, user_type`;
if (rows.length === 0) {
  console.error(`User ${email} not found`);
  process.exit(1);
}
console.log(`✓ Promoted ${email} to superadmin (id: ${rows[0].id})`);
