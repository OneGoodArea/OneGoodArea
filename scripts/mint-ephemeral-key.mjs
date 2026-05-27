// Ephemeral API key minter for ad-hoc prove-on-prod queries.
// Reads DATABASE_URL from process.env (caller must inject from apps/web/.env.local).
// Mints a key for the given userId, prints it ONCE to stdout, exits.
// REVOKE WITH: node scripts/revoke-ephemeral-key.mjs <keyId>
import { neon } from "@neondatabase/serverless";
import crypto from "node:crypto";

const userEmail = process.argv[2] || "ptengelmann@gmail.com";
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const sql = neon(url);

const users = await sql`SELECT id FROM users WHERE email = ${userEmail} LIMIT 1`;
if (users.length === 0) { console.error("user not found"); process.exit(1); }
const userId = users[0].id;

const id = `key_${crypto.randomUUID()}`;
const key = `oga_${crypto.randomBytes(24).toString("hex")}`;
const hash = crypto.createHash("sha256").update(key).digest("hex");
const preview = `${key.slice(0, 12)}...${key.slice(-4)}`;
await sql`INSERT INTO api_keys (id, key_hash, key_prefix, user_id, name)
          VALUES (${id}, ${hash}, ${preview}, ${userId}, 'ephemeral-AR-184')`;
console.log(JSON.stringify({ keyId: id, key }));
