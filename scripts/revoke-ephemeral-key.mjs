import { neon } from "@neondatabase/serverless";
const id = process.argv[2];
const url = process.env.DATABASE_URL;
if (!id || !url) { console.error("usage: revoke <keyId>"); process.exit(1); }
const sql = neon(url);
await sql`UPDATE api_keys SET revoked = TRUE WHERE id = ${id}`;
console.log("revoked", id);
