import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const r = await sql`SELECT COUNT(*)::int AS rows, COUNT(DISTINCT geo_code)::int AS targets FROM peer_assignments`;
console.log("peer_assignments:", r[0]);
